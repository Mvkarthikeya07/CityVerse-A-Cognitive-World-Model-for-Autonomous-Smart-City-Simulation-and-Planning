"""
RSSMDynamics — Recurrent State-Space Model
===========================================
Implements the dynamics core of the world model: a deterministic
recurrent path (GRU) combined with stochastic latent variables,
following the DreamerV2 / PlaNet architecture.

State = (h, z) where:
    h — deterministic hidden state  (GRU output)
    z — stochastic latent variable  (sampled from learned Gaussian)
"""

from __future__ import annotations

from typing import List, Tuple

import numpy as np


class RSSMDynamics:
    """
    Recurrent State-Space Model for city-dynamics prediction.

    Parameters
    ----------
    latent_dim : int       — size of the stochastic latent z
    action_dim : int       — action vector dimensionality
    hidden_dim : int       — GRU hidden state h dimensionality
    stochastic_dim : int   — internal dim for the Gaussian parameters
    """

    def __init__(
        self,
        latent_dim: int = 64,
        action_dim: int = 16,
        hidden_dim: int = 128,
        stochastic_dim: int = 32,
    ) -> None:
        self.latent_dim = latent_dim
        self.action_dim = action_dim
        self.hidden_dim = hidden_dim
        self.stochastic_dim = stochastic_dim

        self._rng = np.random.default_rng(seed=456)
        self._init_weights()

    # ── Core transition ───────────────────────────────────────────────

    def step(
        self,
        prev_h: np.ndarray,
        prev_z: np.ndarray,
        action: np.ndarray,
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Single-step state transition (prior — no observation).

        Parameters
        ----------
        prev_h : shape (hidden_dim,)
        prev_z : shape (latent_dim,)
        action : shape (action_dim,)

        Returns
        -------
        (next_h, next_z) : both np.ndarray
        """
        prev_h = np.asarray(prev_h, dtype=np.float32).ravel()[:self.hidden_dim]
        prev_z = np.asarray(prev_z, dtype=np.float32).ravel()[:self.latent_dim]
        action = np.asarray(action, dtype=np.float32).ravel()[:self.action_dim]

        # Pad if needed
        prev_h = self._pad(prev_h, self.hidden_dim)
        prev_z = self._pad(prev_z, self.latent_dim)
        action = self._pad(action, self.action_dim)

        # Concatenate stochastic state and action as GRU input
        gru_input = np.concatenate([prev_z, action])  # (latent_dim + action_dim,)

        # Deterministic step
        next_h = self._gru_cell(prev_h, gru_input)

        # Stochastic: compute prior parameters from h
        mu, log_sigma = self._prior_params(next_h)
        next_z = self._sample_gaussian(mu, log_sigma)

        return next_h.astype(np.float32), next_z.astype(np.float32)

    # ── Imagination rollout ───────────────────────────────────────────

    def imagine(
        self,
        initial_h: np.ndarray,
        initial_z: np.ndarray,
        action_sequence: List[np.ndarray],
    ) -> List[Tuple[np.ndarray, np.ndarray]]:
        """
        Roll out dynamics from an initial state using only imagined
        (prior) transitions — no observations used.

        Returns list of (h, z) tuples, length = len(action_sequence).
        """
        trajectory: List[Tuple[np.ndarray, np.ndarray]] = []
        h, z = initial_h.copy(), initial_z.copy()

        for action in action_sequence:
            h, z = self.step(h, z, action)
            trajectory.append((h.copy(), z.copy()))

        return trajectory

    # ── Posterior update ───────────────────────────────────────────────

    def observe(
        self,
        prev_h: np.ndarray,
        prev_z: np.ndarray,
        action: np.ndarray,
        observation: np.ndarray,
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Observation-conditioned transition (posterior).

        Uses the observation to compute a more accurate posterior z
        rather than relying on the prior alone.

        Parameters
        ----------
        observation : shape (latent_dim,) or larger — encoded observation
        """
        # First do the deterministic step
        prev_h = self._pad(np.asarray(prev_h, dtype=np.float32).ravel(), self.hidden_dim)
        prev_z = self._pad(np.asarray(prev_z, dtype=np.float32).ravel(), self.latent_dim)
        action = self._pad(np.asarray(action, dtype=np.float32).ravel(), self.action_dim)
        obs = np.asarray(observation, dtype=np.float32).ravel()[:self.latent_dim]
        obs = self._pad(obs, self.latent_dim)

        gru_input = np.concatenate([prev_z, action])
        next_h = self._gru_cell(prev_h, gru_input)

        # Posterior: blend h with observation
        posterior_input = np.concatenate([next_h, obs])
        mu, log_sigma = self._posterior_params(posterior_input)
        next_z = self._sample_gaussian(mu, log_sigma)

        return next_h.astype(np.float32), next_z.astype(np.float32)

    # ── GRU cell (NumPy) ──────────────────────────────────────────────

    def _gru_cell(self, h: np.ndarray, x: np.ndarray) -> np.ndarray:
        """
        Single GRU cell forward pass.

        Gates:
            z_gate = σ(W_z·x + U_z·h + b_z)      (update gate)
            r_gate = σ(W_r·x + U_r·h + b_r)      (reset gate)
            n_gate = tanh(W_n·x + U_n·(r⊙h) + b_n)   (candidate)
            h_new  = (1 − z) ⊙ n + z ⊙ h
        """
        # Update gate
        z_gate = self._sigmoid(x @ self.Wz_x + h @ self.Uz_h + self.bz)
        # Reset gate
        r_gate = self._sigmoid(x @ self.Wr_x + h @ self.Ur_h + self.br)
        # Candidate
        n_gate = np.tanh(x @ self.Wn_x + (r_gate * h) @ self.Un_h + self.bn)
        # New hidden
        h_new = (1 - z_gate) * n_gate + z_gate * h

        return h_new

    # ── Prior / posterior parameter networks ──────────────────────────

    def _prior_params(self, h: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """Compute prior Gaussian params from deterministic state."""
        hidden = self._relu(h @ self.W_prior1 + self.b_prior1)
        params = hidden @ self.W_prior2 + self.b_prior2  # (latent_dim * 2,)
        mu = params[:self.latent_dim]
        log_sigma = np.clip(params[self.latent_dim:], -5.0, 2.0)
        return mu, log_sigma

    def _posterior_params(self, hx: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """Compute posterior Gaussian params from h concatenated with observation."""
        hidden = self._relu(hx @ self.W_post1 + self.b_post1)
        params = hidden @ self.W_post2 + self.b_post2
        mu = params[:self.latent_dim]
        log_sigma = np.clip(params[self.latent_dim:], -5.0, 2.0)
        return mu, log_sigma

    # ── Sampling ──────────────────────────────────────────────────────

    def _sample_gaussian(self, mu: np.ndarray, log_sigma: np.ndarray) -> np.ndarray:
        """Reparameterised Gaussian sample: z = mu + sigma * epsilon."""
        sigma = np.exp(log_sigma)
        eps = self._rng.standard_normal(mu.shape).astype(np.float32)
        return (mu + sigma * eps).astype(np.float32)

    # ── Activations ───────────────────────────────────────────────────

    @staticmethod
    def _sigmoid(x: np.ndarray) -> np.ndarray:
        return 1.0 / (1.0 + np.exp(-np.clip(x, -15, 15)))

    @staticmethod
    def _relu(x: np.ndarray) -> np.ndarray:
        return np.maximum(0, x)

    # ── Helpers ───────────────────────────────────────────────────────

    @staticmethod
    def _pad(vec: np.ndarray, target_len: int) -> np.ndarray:
        """Pad or truncate vector to exact target length."""
        if vec.shape[0] >= target_len:
            return vec[:target_len]
        return np.pad(vec, (0, target_len - vec.shape[0]))

    # ── Weight initialisation ─────────────────────────────────────────

    def _init_weights(self) -> None:
        """Xavier initialisation for all GRU and MLP parameters."""
        rng = self._rng

        def _xavier(fan_in: int, fan_out: int) -> np.ndarray:
            limit = np.sqrt(6.0 / (fan_in + fan_out))
            return rng.uniform(-limit, limit, (fan_in, fan_out)).astype(np.float32)

        input_dim = self.latent_dim + self.action_dim

        # GRU gate weights (input side)
        self.Wz_x = _xavier(input_dim, self.hidden_dim)
        self.Wr_x = _xavier(input_dim, self.hidden_dim)
        self.Wn_x = _xavier(input_dim, self.hidden_dim)

        # GRU gate weights (recurrent side)
        self.Uz_h = _xavier(self.hidden_dim, self.hidden_dim)
        self.Ur_h = _xavier(self.hidden_dim, self.hidden_dim)
        self.Un_h = _xavier(self.hidden_dim, self.hidden_dim)

        # GRU biases
        self.bz = np.zeros(self.hidden_dim, dtype=np.float32)
        self.br = np.zeros(self.hidden_dim, dtype=np.float32)
        self.bn = np.zeros(self.hidden_dim, dtype=np.float32)

        # Prior network: h → (mu, log_sigma)
        self.W_prior1 = _xavier(self.hidden_dim, self.hidden_dim)
        self.b_prior1 = np.zeros(self.hidden_dim, dtype=np.float32)
        self.W_prior2 = _xavier(self.hidden_dim, self.latent_dim * 2)
        self.b_prior2 = np.zeros(self.latent_dim * 2, dtype=np.float32)

        # Posterior network: [h, obs] → (mu, log_sigma)
        post_in = self.hidden_dim + self.latent_dim
        self.W_post1 = _xavier(post_in, self.hidden_dim)
        self.b_post1 = np.zeros(self.hidden_dim, dtype=np.float32)
        self.W_post2 = _xavier(self.hidden_dim, self.latent_dim * 2)
        self.b_post2 = np.zeros(self.latent_dim * 2, dtype=np.float32)

    # ── Convenience ───────────────────────────────────────────────────

    def initial_state(self) -> Tuple[np.ndarray, np.ndarray]:
        """Return zeroed initial (h, z) state."""
        return (
            np.zeros(self.hidden_dim, dtype=np.float32),
            np.zeros(self.latent_dim, dtype=np.float32),
        )
