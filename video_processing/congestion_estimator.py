class CongestionEstimator:
    def __init__(self):
        pass

    def estimate_congestion(self, total_vehicles, avg_speed):
        """
        Calculates a traffic score / congestion percentage (0-100%).
        High vehicles + Low speed = High Congestion.
        """
        # Baseline capacity assumption for this camera view
        capacity = 250
        density = min(total_vehicles / capacity, 1.0)
        
        # Speed factor: 60km/h is perfectly flowing, 0 is jammed
        speed_factor = max(0, min(1.0, (60 - avg_speed) / 60))
        
        # Traffic score is a combination of physical density and slowness
        traffic_score = (density * 0.6 + speed_factor * 0.4) * 100
        
        return {
            "traffic_score": int(traffic_score)
        }
