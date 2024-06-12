"use client"
import { useRef, useState, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import { FormEvent } from 'react';

declare global {
    interface Window {
        stream: MediaStream;
    }

    interface FaceData {
        name: string;
        faceData: { [key: string]: number }; // Assuming faceData is an object with numerical values
    }

    interface KnownFace {
        name: string;
        descriptor: Float32Array;
    }
}

export default function CameraCapture() {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [videoDimensions, setVideoDimensions] = useState({ width: 640, height: 480 });
    const [faceData, setFaceData] = useState<Float32Array | null>(null);
    const [inputName, setInputName] = useState("");
    const [inputMessage, setInputMessage] = useState("");
    const [message, setMessage] = useState("");
    const [captured, setCaptured] = useState(false);

    const videoWidth = videoDimensions.width;
    const videoHeight = videoDimensions.height;

    useEffect(() => {
        // const handleResize = () => {
        //     const newWidth = window.innerWidth * 0.8;
        //     const newHeight = window.innerHeight * 0.8;
        //     setVideoDimensions({ width: newWidth, height: newHeight });
        // };

        const loadModels = async () => {
            const MODEL_URL = process.env.NEXT_PUBLIC_URL + '/models';
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
                faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
            ]);
            startVideo();
        }
        loadModels();
        // handleResize();
        // window.addEventListener('resize', handleResize);
    }, []);

    const startVideo = () => {
        navigator.mediaDevices.getUserMedia({
            video: {}
        })
            .then((stream) => {
                window.stream = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                } else {
                    console.log('videoRef is not yet initialized.');
                }
            })
            .catch((err) => {
                console.log('navigator.MediaDevices.getUserMedia error: ', err.message, err.name);
            });
    }

    const handleVideoOnPlay = async () => {
        const loadKnownFaces = async () => {
            const response = await fetch('/api/getfacedata');
            const res = await response.json();
            const knownFaces: FaceData[] = res.data ?? [];

            return knownFaces.map(face => ({
                name: face.name,
                descriptor: new Float32Array(Object.values(face.faceData))
            }));
        };

        const findBestMatch = (descriptor: Float32Array, knownFaces: KnownFace[]): { distance: number; name: string } => {
            const bestMatch = knownFaces.reduce((best, face) => {
                const distance = faceapi.euclideanDistance(descriptor, face.descriptor);
                return distance < best.distance ? { distance, name: face.name } : best;
            }, { distance: Infinity, name: "unknown" });
            return bestMatch;
        };

        const id = setInterval(async () => {
            if (!videoRef.current || !canvasRef.current) {
                return;
            }

            const displaySize = {
                width: videoWidth,
                height: videoHeight
            };

            const canvas = canvasRef.current;
            canvas.width = videoWidth;
            canvas.height = videoHeight;

            faceapi.matchDimensions(canvas, displaySize)
            const detections = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceExpressions()
                .withFaceDescriptor()
                .withAgeAndGender();

            if (detections) {
                const resizedDetections = faceapi.resizeResults(detections, displaySize);
                canvas.getContext('2d')?.clearRect(0, 0, videoWidth, videoHeight);
                faceapi.draw.drawDetections(canvas, detections);
                // faceapi.draw.drawFaceLandmarks(canvasRef.current, detection)
                faceapi.draw.drawFaceExpressions(canvas, detections);

                const knownFaces = await loadKnownFaces();
                const faceName = findBestMatch(detections.descriptor, knownFaces);

                const threshold = 0.5; // Define your threshold here (value between 0 and 1)
                const namesFromData = faceName.distance < threshold ? faceName.name : 'Unknown';

                const { age, gender, genderProbability } = resizedDetections;
                const genderText = `${gender} - ${Math.round(genderProbability * 100)} %`;
                const ageText = `${Math.round(age)} years`;
                const nameTxt = namesFromData;
                const textField = new faceapi.draw.DrawTextField([nameTxt, genderText, ageText], resizedDetections.detection.box.topLeft);
                textField.draw(canvas);
            }
        }, 500);

        return () => clearInterval(id);
    }

    const handleBtnClck = async () => {
        setMessage("");
        const loadKnownFaces = async () => {
            const response = await fetch('/api/getfacedata');
            const res = await response.json();
            const knownFaces: FaceData[] = res.data ?? [];

            return knownFaces.map(face => ({
                name: face.name,
                descriptor: new Float32Array(Object.values(face.faceData))
            }));
        };

        const findBestMatch = (descriptor: Float32Array, knownFaces: KnownFace[]): { distance: number; name: string } => {
            const bestMatch = knownFaces.reduce((best, face) => {
                const distance = faceapi.euclideanDistance(descriptor, face.descriptor);
                return distance < best.distance ? { distance, name: face.name } : best;
            }, { distance: Infinity, name: "unknown" });
            return bestMatch;
        };

        if (!videoRef.current) {
            return;
        }
        const detections = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceExpressions()
            .withFaceDescriptor()
            .withAgeAndGender();

        if (detections) {
            const descriptor = detections.descriptor;
            const knownFaces = await loadKnownFaces();
            const faceName = findBestMatch(descriptor, knownFaces);

            const threshold = 0.5; // Define your threshold here (value between 0 and 1)
            const namesFromData = faceName.distance < threshold ? faceName.name : null;

            if (!namesFromData) {
                setMessage("");
                setFaceData(descriptor);
                setCaptured(true);
            } else {
                const message = `Hey ${namesFromData}, Your face is already detected!`;
                setMessage(message);
                setTimeout(() => {
                    setMessage("");
                }, 3000);
            }
        }
    }

    const handleFormSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!inputName) {
            setInputMessage("Please enter the name");
            setTimeout(() => {
                setInputMessage("");
            }, 3000);
            return;
        }

        if (faceData) {
            const data = {
                name: inputName,
                faceData: faceData
            };
            saveDataTOJson(data);
        } else {
            console.error('Face data is null');
        }
    }

    const saveDataTOJson = async (data: { name: string; faceData: Float32Array }) => {
        try {
            const response = await fetch(process.env.NEXT_PUBLIC_URL + '/api/facedatajson', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();
            if (result) {
                setCaptured(false);
                startVideo();
                setInputName("");
            }
        } catch (error) {
            console.error('Error saving data:', error);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
            <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-900">
                {!captured ? (
                    <div className="relative">
                        <video ref={videoRef} autoPlay muted className="rounded-lg shadow-lg" onPlay={handleVideoOnPlay}></video>
                        <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />
                        <button
                            onClick={handleBtnClck}
                            className="absolute bottom-0 left-1/2 transform -translate-x-1/2 mb-4 px-4 py-2 bg-blue-500 text-white rounded-lg shadow-md"
                        >
                            Capture
                        </button>
                        {message && (
                            <div className="mt-4 space-x-2" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                                <p className="text-gray-100 bg-black p-2 rounded-md text-sm">{message}</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="w-full max-w-sm bg-gray-800 rounded-lg shadow-md p-6">
                        <h2 className="text-xl font-semibold mb-4">Register your face</h2>
                        <form className="space-y-4" onSubmit={handleFormSubmit}>
                            <div>
                                <label className="block text-gray-400 mb-2">Name</label>
                                <input
                                    onChange={(e) => setInputName(e.target.value)}
                                    value={inputName}
                                    placeholder="Your Name"
                                    type="text"
                                    name="name"
                                    className="text-white bg-transparent w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                {inputMessage && (
                                    <div className="text-red-500 mt-2">{inputMessage}</div>
                                )}
                            </div>
                            <button
                                type="submit"
                                className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-md mb-4"
                            >
                                Register
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
