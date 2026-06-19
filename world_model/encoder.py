"""
WorldModelEncoder — Observation → Latent State
===============================================
3-layer MLP that compresses a high-dimensional observation vector
into a compact latent representation.  All computations use NumPy;
weights are Xavier-initialised and can be serialised to disk.
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional

import numpy as np


class WorldModelEncoder:
    """
    Encodes observation vectors into the world-model latent space.

    Architecture::

        input (input_dim)
          → Linear(hidden_dim) + LayerNorm + ReLU
          → Linear(hidden_dim) + LayerNorm + ReLU
          → Linear(latent_dim)               # output

    Parameters
    ----------
    input_dim : int   — observation feature vector size (default 128)
    hidden_dim : int  — width of hidden layers (default 256)
    latent_dim : int  — output latent vector size (default 64)
    """

    def __init__(
        self,
        input_dim: int = 128,
        hidden_dim: int = 256,
        latent_dim: int = 64,
    ) -> None:
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.latent_dim = latent_dim

        # Weight matrices & biases
        self.W1: np.ndarray = np.empty(0)
        self.b1: np.ndarray = np.empty(0)
        self.W2: np.ndarray = np.empty(0)
        self.b2: np.ndarray = np.empty(0)
        self.W3: np.ndarray = np.empty(0)
        self.b3: np.ndarray = np.empty(0)

        self._init_weights()

    # ── Forward pass ──────────────────────────────────────────────────

    def encode(self, observation: np.ndarray) -> np.ndarray:
        """
        Map an observation vector to the latent space.

        Parameters
        ----------
        observation : np.ndarray, shape (..., input_dim)
            May be a single vector or a batch.

        Returns
        -------
        np.ndarray, shape (..., latent_dim)
        """
        obs = np.asarray(observation, dtype=np.float32)

        # Layer 1
        h1 = obs @ self.W1 + self.b1
        h1 = self._layer_norm(h1)
        h1 = self._relu(h1)

        # Layer 2
        h2 = h1 @ self.W2 + self.b2
        h2 = self._layer_norm(h2)
        h2 = self._relu(h2)

        # Layer 3 — projection to latent space (no activation)
        z = h2 @ self.W3 + self.b3

        return z.astype(np.float32)

    # ── Activations & normalisation ───────────────────────────────────

    @staticmethod
    def _relu(x: np.ndarray) -> np.ndarray:
        """Element-wise ReLU."""
        return np.maximum(0, x)

    @staticmethod
    def _layer_norm(x: np.ndarray, eps: float = 1e-5) -> np.ndarray:
        """
        Layer normalisation across the last axis.

        Stabilises training and keeps latent magnitudes bounded.
        """
        mean = np.mean(x, axis=-1, keepdims=True)
        var = np.var(x, axis=-1, keepdims=True)
        return (x - mean) / np.sqrt(var + eps)

    # ── Weight initialisation ─────────────────────────────────────────

    def _init_weights(self) -> None:
        """Xavier (Glorot) uniform initialisation for all layers."""
        rng = np.random.default_rng(seed=123)

        def _xavier(fan_in: int, fan_out: int) -> np.ndarray:
            limit = np.sqrt(6.0 / (fan_in + fan_out))
            return rng.uniform(-limit, limit, (fan_in, fan_out)).astype(np.float32)

        self.W1 = _xavier(self.input_dim, self.hidden_dim)
        self.b1 = np.zeros(self.hidden_dim, dtype=np.float32)

        self.W2 = _xavier(self.hidden_dim, self.hidden_dim)
        self.b2 = np.zeros(self.hidden_dim, dtype=np.float32)

        self.W3 = _xavier(self.hidden_dim, self.latent_dim)
        self.b3 = np.zeros(self.latent_dim, dtype=np.float32)

    # ── Persistence ───────────────────────────────────────────────────

    def save_weights(self, path: str | Path) -> None:
        """Save all weights to a single ``.npz`` archive."""
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        np.savez(
            path,
            W1=self.W1, b1=self.b1,
            W2=self.W2, b2=self.b2,
            W3=self.W3, b3=self.b3,
        )

    def load_weights(self, path: str | Path) -> None:
        """Load weights from a ``.npz`` archive."""
        data = np.load(str(path))
        self.W1 = data["W1"]
        self.b1 = data["b1"]
        self.W2 = data["W2"]
        self.b2 = data["b2"]
        self.W3 = data["W3"]
        self.b3 = data["b3"]
