import torch
import torch.nn as nn
import numpy as np

class TimeSeriesLSTM(nn.Module):
    # Upgraded to ingest multidimensional state vectors from the Video Pipeline
    def __init__(self, input_size=6, hidden_size=32, num_layers=2, output_size=6):
        super(TimeSeriesLSTM, self).__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
        self.fc = nn.Linear(hidden_size, output_size)

    def forward(self, x):
        h0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size)
        c0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size)
        out, _ = self.lstm(x, (h0, c0))
        out = self.fc(out[:, -1, :])
        return out

class WorldModelPredictor:
    def __init__(self):
        self.model = TimeSeriesLSTM()
        self._train_dummy_model()
        self.model.eval()
        
    def _train_dummy_model(self):
        # Train on a synthetic 6D sine wave to initialize weights
        optimizer = torch.optim.Adam(self.model.parameters(), lr=0.01)
        criterion = nn.MSELoss()
        
        # 6 dimensions: [vehicle_count, avg_speed, density, traffic, aqi, energy]
        x = np.linspace(0, 100, 200)
        bases = [200, 40, 0.5, 100, 50, 400]
        amplitudes = [50, 15, 0.2, 30, 20, 100]
        
        y_multi = []
        for i in range(len(x)):
            vec = [np.sin(x[i]) * amplitudes[j] + bases[j] for j in range(6)]
            y_multi.append(vec)
        y_multi = np.array(y_multi)
        
        seq_length = 12
        X_train, y_train = [], []
        for i in range(len(y_multi) - seq_length):
            X_train.append(y_multi[i:i+seq_length])
            y_train.append(y_multi[i+seq_length])
            
        X_train = torch.FloatTensor(np.array(X_train))
        y_train = torch.FloatTensor(np.array(y_train))
        
        for epoch in range(15):
            optimizer.zero_grad()
            outputs = self.model(X_train)
            loss = criterion(outputs, y_train)
            loss.backward()
            optimizer.step()

    def predict(self, history_data_6d, horizon=24):
        """
        history_data_6d: list of 6D state vectors.
        Returns: list of predicted 6D state vectors.
        """
        preds = []
        current_seq = torch.FloatTensor(history_data_6d).unsqueeze(0)
        
        with torch.no_grad():
            for _ in range(horizon):
                out = self.model(current_seq)
                pred_vec = out.squeeze(0).numpy()
                
                # Add real-world stochastic variance for realism
                noises = np.random.normal(0, [5.0, 1.0, 0.02, 2.0, 1.0, 5.0])
                pred_vec = [max(0, pred_vec[i] + noises[i]) for i in range(6)]
                
                preds.append(pred_vec)
                
                new_element = torch.FloatTensor([[pred_vec]])
                current_seq = torch.cat((current_seq[:, 1:, :], new_element), dim=1)
                
        return preds
