"""
MCTSPlanner & ActorCriticAgent — Action Planning
=================================================
Monte-Carlo Tree Search planner that uses the world model to
evaluate action sequences, plus an actor-critic baseline agent
for fast approximate policy evaluation.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import numpy as np

from world_model.dynamics import RSSMDynamics
from world_model.predictor import StateDecoder, RewardPredictor


# ── Action catalogue ──────────────────────────────────────────────────

ACTION_CATALOGUE: List[Dict[str, object]] = [
    # ── Traffic Management ─────────────────────────────────────────────
    {"id": "adjust_signals",      "name": "Adjust Traffic Signals",        "icon": "fa-traffic-light",    "category": "traffic"},
    {"id": "reroute_traffic",     "name": "Reroute Traffic",               "icon": "fa-route",            "category": "traffic"},
    {"id": "increase_green_time", "name": "Increase Green-Light Duration", "icon": "fa-clock",            "category": "traffic"},
    {"id": "reduce_speed_limit",  "name": "Reduce Speed Limits",           "icon": "fa-gauge-simple",     "category": "traffic"},
    {"id": "emergency_corridor",  "name": "Create Emergency Corridor",     "icon": "fa-kit-medical",      "category": "traffic"},
    
    # ── Energy Management ──────────────────────────────────────────────
    {"id": "activate_ev_charging","name": "Activate EV Charging Stations", "icon": "fa-charging-station", "category": "energy"},
    {"id": "curtail_grid_load",   "name": "Curtail Non-Essential Load",    "icon": "fa-plug-circle-minus","category": "energy"},
    {"id": "boost_solar",         "name": "Maximise Solar Tracking",       "icon": "fa-solar-panel",      "category": "energy"},
    {"id": "discharge_battery",   "name": "Dispatch Battery Energy Storage", "icon": "fa-battery-three-quarters", "category": "energy"},
    
    # ── Water Management ───────────────────────────────────────────────
    {"id": "optimize_pressure",   "name": "Optimize Water Grid Pressure",  "icon": "fa-faucet",           "category": "water"},
    {"id": "leak_dispatch",       "name": "Dispatch Leak Repair Team",     "icon": "fa-wrench",           "category": "water"},
    {"id": "recycle_wastewater",  "name": "Activate Wastewater Recycling", "icon": "fa-water-recycled",   "category": "water"},
    
    # ── Waste Management ───────────────────────────────────────────────
    {"id": "smart_waste_routing", "name": "Optimize Waste Truck Routing",  "icon": "fa-truck-ramp-box",   "category": "waste"},
    {"id": "bin_fill_alerts",     "name": "Enable Bin Fill Level Alerts",  "icon": "fa-bell",             "category": "waste"},
    {"id": "sorting_efficiency",  "name": "Increase Auto-Sorting Power",   "icon": "fa-recycle",          "category": "waste"},
    
    # ── Healthcare ─────────────────────────────────────────────────────
    {"id": "reallocate_beds",     "name": "Reallocate Emergency Beds",     "icon": "fa-bed-pulse",        "category": "healthcare"},
    {"id": "mobile_health_units", "name": "Deploy Mobile Health Units",    "icon": "fa-truck-medical",    "category": "healthcare"},
    {"id": "air_quality_warning", "name": "Issue Health Alerts (Air/Heat)", "icon": "fa-circle-exclamation", "category": "healthcare"},
    
    # ── Public Safety & Security ───────────────────────────────────────
    {"id": "dispatch_patrols",    "name": "Re-route Police Patrols",       "icon": "fa-car-side",         "category": "safety"},
    {"id": "adjust_lighting",     "name": "Dynamic Streetlight Brightness", "icon": "fa-lightbulb",        "category": "safety"},
    {"id": "activate_surveillance","name": "Deploy UAV Drone Surveillance", "icon": "fa-helicopter",       "category": "safety"},
    
    # ── Environment Monitoring ─────────────────────────────────────────
    {"id": "activate_carbon_scrubbers", "name": "Activate Carbon Scrubbers", "icon": "fa-filter",         "category": "environment"},
    {"id": "green_roof_incentives", "name": "Enable Urban Greening Projects", "icon": "fa-leaf",          "category": "environment"},
    {"id": "enforce_noise_zones", "name": "Restrict Construction Noise",   "icon": "fa-volume-xmark",     "category": "environment"},
]


@dataclass
class MCTSNode:
    """Single node in the MCTS search tree."""

    state_h: np.ndarray
    state_z: np.ndarray
    parent: Optional["MCTSNode"] = None
    children: List["MCTSNode"] = field(default_factory=list)
    visits: int = 0
    total_reward: float = 0.0
    action: Optional[np.ndarray] = None
    action_id: Optional[str] = None
    depth: int = 0

    @property
    def avg_reward(self) -> float:
        return self.total_reward / max(1, self.visits)


class MCTSPlanner:
    """
    Monte-Carlo Tree Search planner over the learned world model.

    Parameters
    ----------
    dynamics : RSSMDynamics
    decoder : StateDecoder
    reward_predictor : RewardPredictor
    num_iterations : int    — MCTS rollout budget
    exploration : float     — UCB1 exploration constant (c)
    max_depth : int         — maximum simulation depth
    """

    def __init__(
        self,
        dynamics: RSSMDynamics,
        decoder: StateDecoder,
        reward_predictor: RewardPredictor,
        num_iterations: int = 100,
        exploration: float = 1.414,
        max_depth: int = 10,
    ) -> None:
        self.dynamics = dynamics
        self.decoder = decoder
        self.reward_predictor = reward_predictor
        self.num_iterations = num_iterations
        self.exploration = exploration
        self.max_depth = max_depth
        self._rng = np.random.default_rng(seed=321)

    # ── Public entry point ────────────────────────────────────────────

    def plan(
        self,
        current_h: np.ndarray,
        current_z: np.ndarray,
        objective: str = "balanced",
    ) -> Dict:
        """
        Run MCTS and return the recommended action plan.

        Returns
        -------
        dict with keys:
            best_actions — ordered list of recommended actions
            expected_reward — estimated cumulative reward
            tree_stats — {nodes_expanded, max_depth_reached, iterations}
            action_comparisons — per-action reward estimates
        """
        root = MCTSNode(state_h=current_h.copy(), state_z=current_z.copy())

        nodes_expanded = 0
        max_depth_reached = 0

        for _ in range(self.num_iterations):
            # 1. Select
            node = self._select(root)
            # 2. Expand
            if node.visits > 0 and node.depth < self.max_depth:
                node = self._expand(node)
                nodes_expanded += 1
            # 3. Simulate
            reward = self._simulate(node, objective)
            # 4. Backpropagate
            self._backpropagate(node, reward)

            max_depth_reached = max(max_depth_reached, node.depth)

        # ── Collect results ───────────────────────────────────────────
        action_comparisons = []
        for child in root.children:
            action_comparisons.append({
                "action_id": child.action_id or "unknown",
                "action_name": self._action_name(child.action_id),
                "visits": child.visits,
                "avg_reward": round(child.avg_reward, 4),
                "confidence": round(0.75 + (child.visits / max(1, self.num_iterations)) * 0.24, 3),
            })

        # Sort by average reward
        action_comparisons.sort(key=lambda a: a["avg_reward"], reverse=True)

        # Build best-action sequence (greedily descend tree)
        best_actions = []
        node = root
        for _ in range(min(5, self.max_depth)):
            if not node.children:
                break
            best_child = max(node.children, key=lambda c: c.avg_reward)
            if best_child.action_id:
                best_actions.append({
                    "action_id": best_child.action_id,
                    "action_name": self._action_name(best_child.action_id),
                    "expected_reward": round(best_child.avg_reward, 4),
                    "icon": self._action_icon(best_child.action_id),
                    "category": self._action_category(best_child.action_id),
                })
            node = best_child

        expected_reward = root.children[0].avg_reward if root.children else 0.0

        return {
            "best_actions": best_actions,
            "expected_reward": round(expected_reward, 4),
            "tree_stats": {
                "nodes_expanded": nodes_expanded,
                "max_depth_reached": max_depth_reached,
                "total_iterations": self.num_iterations,
                "root_visits": root.visits,
            },
            "action_comparisons": action_comparisons[:len(ACTION_CATALOGUE)],
        }

    # ── MCTS phases ───────────────────────────────────────────────────

    def _select(self, node: MCTSNode) -> MCTSNode:
        """UCB1 tree-descent to a leaf node."""
        while node.children and node.depth < self.max_depth:
            node = max(node.children, key=lambda c: self._ucb1(c, node))
        return node

    def _expand(self, node: MCTSNode) -> MCTSNode:
        """Add children for each available action."""
        if node.children:
            # Already expanded – pick least-visited child
            return min(node.children, key=lambda c: c.visits)

        actions = self._get_action_space()
        for act_vec, act_id in actions:
            next_h, next_z = self.dynamics.step(node.state_h, node.state_z, act_vec)
            child = MCTSNode(
                state_h=next_h,
                state_z=next_z,
                parent=node,
                action=act_vec,
                action_id=act_id,
                depth=node.depth + 1,
            )
            node.children.append(child)

        return node.children[0] if node.children else node

    def _simulate(self, node: MCTSNode, objective: str = "balanced") -> float:
        """
        Random rollout from node to max_depth, accumulating discounted reward.
        """
        h, z = node.state_h.copy(), node.state_z.copy()
        total_reward = 0.0
        discount = 1.0
        gamma = 0.95

        remaining_depth = self.max_depth - node.depth
        actions = self._get_action_space()

        for step in range(remaining_depth):
            # Pick a random action
            act_vec, _ = actions[self._rng.integers(0, len(actions))]
            h, z = self.dynamics.step(h, z, act_vec)

            # Decode and score
            preds = self.decoder.decode(h, z)
            r = self.reward_predictor.predict_reward(h, z, objective, predictions=preds)

            total_reward += discount * r
            discount *= gamma

        return total_reward

    def _backpropagate(self, node: MCTSNode, reward: float) -> None:
        """Walk up the tree, updating visit counts and reward totals."""
        current: Optional[MCTSNode] = node
        while current is not None:
            current.visits += 1
            current.total_reward += reward
            current = current.parent

    # ── UCB1 ──────────────────────────────────────────────────────────

    def _ucb1(self, child: MCTSNode, parent: MCTSNode) -> float:
        """Upper Confidence Bound for tree policy."""
        if child.visits == 0:
            return float("inf")
        exploit = child.avg_reward
        explore = self.exploration * math.sqrt(math.log(parent.visits + 1) / child.visits)
        return exploit + explore

    # ── Action space ──────────────────────────────────────────────────

    def _get_action_space(self) -> List[Tuple[np.ndarray, str]]:
        """
        Return list of (action_vector, action_id) pairs.

        Each action is encoded as a one-hot-like vector of length action_dim
        with some Gaussian perturbation to model continuous parameters.
        """
        result = []
        n_actions = len(ACTION_CATALOGUE)
        dim = self.dynamics.action_dim

        for i, act in enumerate(ACTION_CATALOGUE):
            vec = np.zeros(dim, dtype=np.float32)
            # Spread action indices across the vector
            idx = i % dim
            vec[idx] = 1.0
            # Add small Gaussian noise for continuous parameterisation
            vec += self._rng.normal(0, 0.05, dim).astype(np.float32)
            result.append((vec, act["id"]))

        return result

    # ── Helpers ───────────────────────────────────────────────────────

    @staticmethod
    def _action_name(action_id: Optional[str]) -> str:
        for a in ACTION_CATALOGUE:
            if a["id"] == action_id:
                return str(a["name"])
        return "Unknown Action"

    @staticmethod
    def _action_icon(action_id: Optional[str]) -> str:
        for a in ACTION_CATALOGUE:
            if a["id"] == action_id:
                return str(a["icon"])
        return "fa-question"

    @staticmethod
    def _action_category(action_id: Optional[str]) -> str:
        for a in ACTION_CATALOGUE:
            if a["id"] == action_id:
                return str(a["category"])
        return "general"


# ══════════════════════════════════════════════════════════════════════

class ActorCriticAgent:
    """
    Lightweight actor-critic agent for fast approximate planning.

    Uses two MLPs:
        actor  — latent state → action probabilities
        critic — latent state → value estimate V(s)

    Parameters
    ----------
    latent_dim : int  — stochastic z size
    action_dim : int  — output action vector size
    hidden_dim : int  — MLP hidden width
    """

    def __init__(
        self,
        latent_dim: int = 64,
        action_dim: int = 16,
        hidden_dim: int = 128,
    ) -> None:
        self.latent_dim = latent_dim
        self.action_dim = action_dim
        self.hidden_dim = hidden_dim
        self._rng = np.random.default_rng(seed=654)

        input_dim = hidden_dim + latent_dim  # expects concatenated [h, z]

        def _xavier(fi: int, fo: int) -> np.ndarray:
            lim = np.sqrt(6.0 / (fi + fo))
            return self._rng.uniform(-lim, lim, (fi, fo)).astype(np.float32)

        # Actor network
        self.Wa1 = _xavier(input_dim, hidden_dim)
        self.ba1 = np.zeros(hidden_dim, dtype=np.float32)
        self.Wa2 = _xavier(hidden_dim, action_dim)
        self.ba2 = np.zeros(action_dim, dtype=np.float32)

        # Critic network
        self.Wc1 = _xavier(input_dim, hidden_dim)
        self.bc1 = np.zeros(hidden_dim, dtype=np.float32)
        self.Wc2 = _xavier(hidden_dim, 1)
        self.bc2 = np.zeros(1, dtype=np.float32)

    def select_action(self, h: np.ndarray, z: np.ndarray) -> np.ndarray:
        """
        Select an action vector given latent state (h, z).

        Returns softmax-normalised action weights (action_dim,).
        """
        x = np.concatenate([
            np.asarray(h, dtype=np.float32).ravel(),
            np.asarray(z, dtype=np.float32).ravel(),
        ])
        if x.shape[0] < self.Wa1.shape[0]:
            x = np.pad(x, (0, self.Wa1.shape[0] - x.shape[0]))
        x = x[:self.Wa1.shape[0]]

        hidden = np.maximum(0, x @ self.Wa1 + self.ba1)
        logits = hidden @ self.Wa2 + self.ba2

        # Softmax
        exp_l = np.exp(logits - np.max(logits))
        action = exp_l / (exp_l.sum() + 1e-8)

        return action.astype(np.float32)

    def evaluate(self, h: np.ndarray, z: np.ndarray) -> float:
        """Estimate state value V(s)."""
        x = np.concatenate([
            np.asarray(h, dtype=np.float32).ravel(),
            np.asarray(z, dtype=np.float32).ravel(),
        ])
        if x.shape[0] < self.Wc1.shape[0]:
            x = np.pad(x, (0, self.Wc1.shape[0] - x.shape[0]))
        x = x[:self.Wc1.shape[0]]

        hidden = np.maximum(0, x @ self.Wc1 + self.bc1)
        value = (hidden @ self.Wc2 + self.bc2)[0]

        return float(value)
