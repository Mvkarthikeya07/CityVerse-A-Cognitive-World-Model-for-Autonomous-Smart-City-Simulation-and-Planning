from .video_loader import VideoLoader
from .detector import YoloDetector
from .tracker import Tracker
from .speed_estimator import SpeedEstimator
from .congestion_estimator import CongestionEstimator
from .feature_extractor import FeatureExtractor

class CameraManager:
    def __init__(self):
        self.loader = VideoLoader()
        self.detector = YoloDetector()
        self.tracker = Tracker()
        self.speed_est = SpeedEstimator()
        self.congestion_est = CongestionEstimator()
        self.feature_ext = FeatureExtractor()

    def process_live_feed(self, global_traffic_state=1.0):
        """
        Executes one full pass of the Video Intelligence Pipeline.
        global_traffic_state influences the mock data (e.g. 2.0 = heavy traffic).
        """
        frame_id = self.loader.get_next_frame()
        
        # 1. Object Detection (YOLO)
        detections = self.detector.detect(frame_id, traffic_level_multiplier=global_traffic_state)
        
        # 2. Tracking
        tracks = self.tracker.track(detections, frame_id)
        
        # 3. Analytics (Speed & Congestion)
        speed = self.speed_est.estimate_speed(tracks, traffic_level_multiplier=global_traffic_state)
        
        total_vehicles = sum(detections.values())
        congestion = self.congestion_est.estimate_congestion(total_vehicles, speed["avg_speed"])
        
        # 4. Feature Extraction
        features = self.feature_ext.extract(detections, speed, congestion)
        
        return {
            "frame": frame_id,
            "features": features
        }
