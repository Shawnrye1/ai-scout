import { NextResponse } from 'next/server';

// Mock model data - in production, this would come from Modal.com or a database
const MODELS = [
  {
    id: 'yolov8-player',
    name: 'YOLOv8 Player Detection',
    type: 'detection',
    version: 'v1.2.0',
    status: 'active',
    metrics: { accuracy: 94.2, precision: 92.1, recall: 95.8, f1Score: 93.9, lastUpdated: '2024-01-15' },
    trainingDataCount: 15420,
    lastTrainedAt: '2024-01-15T10:30:00Z',
  },
  {
    id: 'bytetrack',
    name: 'ByteTrack Multi-Object',
    type: 'tracking',
    version: 'v2.1.0',
    status: 'active',
    metrics: { accuracy: 91.5, precision: 89.3, recall: 93.2, f1Score: 91.2, lastUpdated: '2024-01-10' },
    trainingDataCount: 8750,
    lastTrainedAt: '2024-01-10T14:20:00Z',
  },
  {
    id: 'easyocr-jersey',
    name: 'Jersey Number OCR',
    type: 'ocr',
    version: 'v1.0.5',
    status: 'active',
    metrics: { accuracy: 87.3, precision: 85.1, recall: 89.6, f1Score: 87.3, lastUpdated: '2024-01-12' },
    trainingDataCount: 23100,
    lastTrainedAt: '2024-01-12T08:45:00Z',
  },
  {
    id: 'play-classifier',
    name: 'Play Type Classifier',
    type: 'classification',
    version: 'v0.9.2',
    status: 'active',
    metrics: { accuracy: 82.1, precision: 80.5, recall: 83.7, f1Score: 82.1, lastUpdated: '2024-01-08' },
    trainingDataCount: 4200,
    lastTrainedAt: '2024-01-08T16:00:00Z',
  },
];

export async function GET() {
  return NextResponse.json({ models: MODELS });
}
