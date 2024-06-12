"use client"
import { useRef, useState, useEffect } from 'react';
import * as faceapi from 'face-api.js'

declare global {
    interface Window {
        stream: MediaStream;
    }
}

export default function CameraCapture() {
    const videoRef = useRef();
    const canvasRef = useRef();
    const [videoDimensions, setVideoDimensions] = useState({ width: 640, height: 480 });
    const [faceData, setFaceData] = useState([]);
    // const [showForm, setShowForm] = useState(false);
    const [inputName, setInputName] = useState("");
    const [inputMessage, setInputMessage] = useState("");
    const [message, setMessage] = useState("");
    const [captured, setCaptured] = useState(false);

    const videoWidth = videoDimensions.width;
    const videoHeight = videoDimensions.height;

    useEffect(() => {
        const handleResize = () => {
            const newWidth = window.innerWidth * 0.8;
            const newHeight = window.innerHeight * 0.8;
            setVideoDimensions({ width: newWidth, height: newHeight });
        };

        const loadModels = () => {
            const MODEL_URL = process.env.NEXT_PUBLIC_URL + '/models';

            Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
                faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),

            ]).then(startVideo)
        }
        loadModels()
        // handleResize()

        // return () => {
        //     window.removeEventListener('resize', handleResize);
        // };
    }, []);

    const startVideo = () => {
        navigator.mediaDevices.getUserMedia({
            video: {}
        })
            .then((stream) => {
                window.stream = stream
                videoRef.current.srcObject = stream
            })
            .catch((err) => {
                console.log('navigator.MediaDevices.getUserMedia error: ', err.message, err.name);
            })
    }

    const handleVideoOnPlay = () => {
        const loadKnownFaces = async () => {
            const response = await fetch('/api/getfacedata');
            const res = await response.json();
            const knownFaces = res.data ?? [];

            return knownFaces.map(face => ({
                name: face.name,
                descriptor: new Float32Array(Object.values(face.faceData))
            }));
        };

        const findBestMatch = (descriptor, knownFaces) => {

            const bestMatch = knownFaces.reduce((best, face) => {
                const distance = faceapi.euclideanDistance(descriptor, face.descriptor);
                return distance < best.distance ? { distance, name: face.name } : best;
            }, { distance: Infinity, name: "unknown" });
            return bestMatch;
        };

        const id = setInterval(async () => {
            if (!videoRef.current) {
                return null
            }

            canvasRef.current.innerHtml = faceapi.createCanvasFromMedia(videoRef.current);
            const displaySize = {
                width: videoWidth,
                height: videoHeight
            }

            faceapi.matchDimensions(canvasRef.current, displaySize)
            const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions().withFaceDescriptor().withAgeAndGender();

            if (detection) {
                const resizedRes = faceapi.resizeResults(detection, displaySize)
                if (!canvasRef.current) {
                    return null;
                }
                canvasRef.current.getContext('2d').clearRect(0, 0, videoWidth, videoHeight)
                faceapi.draw.drawDetections(canvasRef.current, detection)
                // faceapi.draw.drawFaceLandmarks(canvasRef.current, detection)
                faceapi.draw.drawFaceExpressions(canvasRef.current, detection)

                const knownFaces = await loadKnownFaces();
                const faceName = findBestMatch(detection.descriptor, knownFaces);

                const threshold = 0.5; // Define your threshold here (value between 0 and 1)
                const namesFromData = faceName.distance < threshold ? faceName.name : 'Unknown';

                const { age, gender, genderProbability } = resizedRes
                const genderText = `${gender} - ${Math.round(genderProbability * 100)} %`;
                const ageText = `${Math.round(age)} years`;
                const nameTxt = namesFromData;
                const textField = new faceapi.draw.DrawTextField([nameTxt, genderText, ageText], resizedRes.detection.box.topLeft)
                textField.draw(canvasRef.current)
            }
        }, 600)
    }

    const handleBtnClck = async () => {
        setMessage("")
        const loadKnownFaces = async () => {
            const response = await fetch('/api/getfacedata');
            const res = await response.json();
            const knownFaces = res.data ?? [];

            return knownFaces.map(face => ({
                name: face.name,
                descriptor: new Float32Array(Object.values(face.faceData))
            }));
        };

        const findBestMatch = (descriptor, knownFaces) => {
            const bestMatch = knownFaces.reduce((best, face) => {
                const distance = faceapi.euclideanDistance(descriptor, face.descriptor);
                return distance < best.distance ? { distance, name: face.name } : best;
            }, { distance: Infinity, name: "unknown" });
            return bestMatch;
        };

        const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions().withFaceDescriptor().withAgeAndGender();

        if (detection) {
            const descriptor = detection.descriptor;

            const knownFaces = await loadKnownFaces();
            const faceName = findBestMatch(detection.descriptor, knownFaces);

            const threshold = 0.5; // Define your threshold here (value between 0 and 1)
            const namesFromData = faceName.distance < threshold ? faceName.name : null;

            if (!namesFromData) {
                setMessage("")
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

    const handleFormSubmit = (e) => {
        e.preventDefault();

        if (!inputName) {
            setInputMessage("Please enter the name");
            setTimeout(() => {
                setInputMessage("");
            }, 3000);
            return;
        }

        const data = {
            name: inputName,
            faceData: faceData
        }

        saveDataTOJson(data)
    }

    const saveDataTOJson = async (data) => {
        try {
            fetch(process.env.NEXT_PUBLIC_URL + '/api/facedatajson', {
                method: 'POST',
                body: JSON.stringify(data)
            })
                .then((res) => res.json())
                .then((res) => {
                    setCaptured(false)
                    startVideo()
                    setInputName("")
                })
        } catch (error) {
            console.error('Error saving data:', error);
        }
    }

    return (
        <div className="min-h-screen items-center justify-center bg-gray-900 text-white">
            <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-900">
                {!captured ? (
                    <div className="relative">
                        <video ref={videoRef} autoPlay muted className="rounded-lg shadow-lg" onPlay={handleVideoOnPlay}></video>
                        <canvas ref={canvasRef} className="absolute top-0 left-0 w-full" />
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
                    <div className="w-full max-w-sm bg-gray rounded-lg shadow-md p-6">
                        <h2 className="text-xl font-semibold mb-4">Register your face</h2>
                        <form className="space-y-4" onSubmit={handleFormSubmit}>
                            <div>
                                <label className="block text-gray-700 text-white">Name</label>
                                <input onInput={(e) => setInputName(e.target.value)} value={inputName ?? ""} placeholder="Your Name" type="text" name="name" className="text-white bg-transparent w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                                {inputMessage && (<div>{inputMessage}</div>)}
                            </div>
                            <button type="submit" className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-md">
                                Register
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
