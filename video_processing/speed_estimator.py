import random

class SpeedEstimator:
    def __init__(self):
        pass

    def estimate_speed(self, tracked_data, traffic_level_multiplier=1.0):
        """Simulate calculating average speed (km/h) across all tracked boxes."""
        # High traffic = lower speed
        # If multiplier is 1.0 (normal), speed is ~40-60
        # If multiplier is 2.0 (high traffic), speed drops to ~10-30
        
        base_speed = random.randint(40, 60)
        actual_speed = max(5, int(base_speed / max(0.5, traffic_level_multiplier)))
        
        return {
            "avg_speed": actual_speed
        }
