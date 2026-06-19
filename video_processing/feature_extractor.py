class FeatureExtractor:
    def __init__(self):
        pass

    def extract(self, detection_data, speed_data, congestion_data):
        """
        Condenses the raw CV outputs into a fixed-length feature vector
        suitable for the RSSM/LSTM World Model.
        """
        total_vehicles = sum(detection_data.values())
        
        # We output a dictionary representing the multidimensional vector
        return {
            "vehicle_count": total_vehicles,
            "avg_speed": speed_data["avg_speed"],
            "density": min(1.0, total_vehicles / 250.0), # Assuming max capacity 250
            "traffic_score": congestion_data["traffic_score"],
            "raw_detections": detection_data
        }
