import random

class VideoLoader:
    def __init__(self, source_path="highway.mp4"):
        self.source_path = source_path
        self.frame_index = 0

    def get_next_frame(self):
        """Simulate reading frames from a video stream."""
        self.frame_index += 1
        return f"frame_{self.frame_index:03d}"
