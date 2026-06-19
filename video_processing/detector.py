import random

class YoloDetector:
    def __init__(self):
        pass

    def detect(self, frame, traffic_level_multiplier=1.0):
        """Simulate YOLO detection counting vehicle classes in a frame."""
        # Baseline numbers that change based on global traffic state
        base_cars = random.randint(80, 180) * traffic_level_multiplier
        base_bikes = random.randint(20, 80) * traffic_level_multiplier
        base_trucks = random.randint(5, 20) * traffic_level_multiplier
        base_buses = random.randint(2, 12) * traffic_level_multiplier
        
        return {
            "cars": int(base_cars),
            "bikes": int(base_bikes),
            "trucks": int(base_trucks),
            "buses": int(base_buses)
        }
