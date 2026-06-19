import cv2
import threading
import time
import os
import numpy as np
from ultralytics import YOLO

class YoloVideoProcessor:
    def __init__(self):
        self.model = YOLO('yolov8s.pt')
        self.video_path = None
        self.cap = None
        self.current_frame = None
        self.running = False
        self.lock = threading.Lock()
        
        # Telemetry data
        self.telemetry = {
            "cars": 0,
            "trucks": 0,
            "bikes": 0,
            "buses": 0,
            "total": 0,
            "density": 0.0,
            "speed": 0.0,
            "traffic_score": 0
        }
        
        # COCO class mappings for YOLOv8
        self.class_map = {
            2: "cars",
            3: "bikes",  # motorcycle
            5: "buses",
            7: "trucks"
        }

    def start_video(self, video_path, camera_id='1'):
        # Stop existing run if active
        with self.lock:
            self.running = False
            if self.cap is not None:
                self.cap.release()
                self.cap = None
        
        # Give previous thread a brief moment to finish
        time.sleep(0.1)

        with self.lock:
            self.video_path = os.path.abspath(video_path)
            self.camera_id = str(camera_id)
            print(f"Opening video file: {self.video_path} for camera: {self.camera_id}")
            self.cap = cv2.VideoCapture(self.video_path)
            if not self.cap.isOpened():
                print(f"Error: Could not open video file: {self.video_path}")
                return False
            
            # Set initial frame offsets to distinguish feeds
            if self.camera_id == '2':
                self.cap.set(cv2.CAP_PROP_POS_FRAMES, 400)
            elif self.camera_id == '3':
                self.cap.set(cv2.CAP_PROP_POS_FRAMES, 800)
                
            self.running = True
            self.current_frame = None
            
        # Start processing thread
        threading.Thread(target=self._process_loop, daemon=True).start()
        return True

    def stop_video(self):
        with self.lock:
            self.running = False
            if self.cap is not None:
                self.cap.release()
                self.cap = None
            self.current_frame = None
            self.telemetry = {
                "cars": 0,
                "trucks": 0,
                "bikes": 0,
                "buses": 0,
                "total": 0,
                "density": 0.0,
                "speed": 0.0,
                "traffic_score": 0
            }
        print("YoloVideoProcessor: Video processing stopped.")

    def _process_loop(self):
        print(f"YOLO processing loop thread started for Cam {self.camera_id}.")
        consecutive_failures = 0
        while self.running:
            frame = None
            with self.lock:
                if self.cap is None or not self.cap.isOpened():
                    print("VideoCapture not opened or closed, stopping loop.")
                    break
                ret, frame = self.cap.read()
                if not ret:
                    consecutive_failures += 1
                    if consecutive_failures > 15:
                        print("YoloVideoProcessor: Too many consecutive read failures, stopping thread.")
                        self.running = False
                        break
                    
                    # Loop video back to starting frame offset
                    start_frame = 0
                    if self.camera_id == '2':
                        start_frame = 400
                    elif self.camera_id == '3':
                        start_frame = 800
                    self.cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)
                    continue
                else:
                    consecutive_failures = 0

            if frame is None:
                time.sleep(0.01)
                continue

            try:
                # Apply camera-specific visual transformations
                processed_frame = frame.copy()
                h_img, w_img = processed_frame.shape[:2]
                
                if self.camera_id == '2':
                    # Grayscale with blue tint + zoom crop (center 80%)
                    cy, cx = h_img // 2, w_img // 2
                    dy, dx = int(h_img * 0.4), int(w_img * 0.4)
                    processed_frame = processed_frame[cy-dy:cy+dy, cx-dx:cx+dx]
                    # Grayscale
                    gray = cv2.cvtColor(processed_frame, cv2.COLOR_BGR2GRAY)
                    processed_frame = cv2.merge([gray, gray, gray])
                    # Add blue tint
                    processed_frame[:, :, 0] = cv2.add(processed_frame[:, :, 0], 30)
                    
                elif self.camera_id == '3':
                    # Grayscale with green tint + flip horizontally + zoom crop (center 80%)
                    cy, cx = h_img // 2, w_img // 2
                    dy, dx = int(h_img * 0.4), int(w_img * 0.4)
                    processed_frame = processed_frame[cy-dy:cy+dy, cx-dx:cx+dx]
                    # Flip horizontally
                    processed_frame = cv2.flip(processed_frame, 1)
                    # Grayscale
                    gray = cv2.cvtColor(processed_frame, cv2.COLOR_BGR2GRAY)
                    processed_frame = cv2.merge([gray, gray, gray])
                    # Add green tint
                    processed_frame[:, :, 1] = cv2.add(processed_frame[:, :, 1], 40)

                # Run YOLO inference
                results = self.model.predict(source=processed_frame, classes=[2, 3, 5, 7], conf=0.3, verbose=False)
                
                annotated_frame = results[0].plot()
                
                # Count classes
                counts = {"cars": 0, "bikes": 0, "buses": 0, "trucks": 0}
                boxes = results[0].boxes
                for box in boxes:
                    cls_id = int(box.cls[0].item())
                    if cls_id in self.class_map:
                        counts[self.class_map[cls_id]] += 1
                
                total_vehicles = sum(counts.values())
                
                # Calculate arbitrary physical density and score based on bounding boxes
                area_ratio = 0
                if len(boxes) > 0:
                    frame_area = processed_frame.shape[0] * processed_frame.shape[1]
                    boxes_area = sum([(b.xyxy[0][2]-b.xyxy[0][0]) * (b.xyxy[0][3]-b.xyxy[0][1]) for b in boxes])
                    area_ratio = float((boxes_area / frame_area).item())
                    
                density = min(1.0, area_ratio * 3.0)  # scale up a bit for visual score
                
                # Simulated speed (inversely proportional to density)
                speed = max(10, 80 - (density * 100))
                if total_vehicles == 0:
                    speed = 0
                    
                traffic_score = min(100, int((density * 100) + (total_vehicles * 2)))

                # Update state
                with self.lock:
                    self.current_frame = annotated_frame
                    self.telemetry = {
                        "cars": counts["cars"],
                        "trucks": counts["trucks"],
                        "bikes": counts["bikes"],
                        "buses": counts["buses"],
                        "total": total_vehicles,
                        "density": density,
                        "speed": speed,
                        "traffic_score": traffic_score
                    }
            except Exception as e:
                print(f"YoloVideoProcessor exception in process loop: {e}")
                time.sleep(0.1)
                
            # Control frame rate (simulate ~30 fps processing)
            time.sleep(0.03)
        print(f"YOLO processing loop thread finished for Cam {self.camera_id}.")

    def get_latest_frame_jpeg(self):
        with self.lock:
            frame = self.current_frame
        
        if frame is None:
            # Return a black frame if nothing is loaded
            frame = np.zeros((480, 640, 3), dtype=np.uint8)
            
        ret, jpeg = cv2.imencode('.jpg', frame)
        if not ret:
            # Fallback black frame encode if encoding fails
            fallback = np.zeros((480, 640, 3), dtype=np.uint8)
            _, jpeg = cv2.imencode('.jpg', fallback)
        return jpeg.tobytes()

    def get_telemetry(self):
        with self.lock:
            return self.telemetry.copy()

