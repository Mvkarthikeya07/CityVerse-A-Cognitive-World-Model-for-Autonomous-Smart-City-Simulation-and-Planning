"""
CityMind-AI — World Model Package
==================================
A Recurrent State-Space Model (RSSM) world model for smart city
dynamics prediction, featuring:

- **Encoder** — maps raw observations to latent states
- **RSSMDynamics** — recurrent dynamics model with stochastic transitions
- **StateDecoder / RewardPredictor** — decodes latent states to metrics & rewards
- **MCTSPlanner / ActorCriticAgent** — action planning via tree search
- **WorldModelSimulator** — end-to-end simulation pipeline
"""

from world_model.encoder import WorldModelEncoder
from world_model.dynamics import RSSMDynamics
from world_model.predictor import StateDecoder, RewardPredictor
from world_model.planner import MCTSPlanner, MCTSNode, ActorCriticAgent
from world_model.simulator import WorldModelSimulator

__all__ = [
    "WorldModelEncoder",
    "RSSMDynamics",
    "StateDecoder",
    "RewardPredictor",
    "MCTSPlanner",
    "MCTSNode",
    "ActorCriticAgent",
    "WorldModelSimulator",
]
