# FaceAPI with Next.js

This project demonstrates the integration of FaceAPI with Next.js, allowing for facial recognition and analysis within a web application. FaceAPI provides powerful facial recognition capabilities that can be utilized for various applications such as authentication, sentiment analysis, and more.

## Live Demo

Check out the live demo hosted on [Netlify](https://samcb-faceapi.netlify.app).

## Technologies Used

- **Next.js**: Next.js is a React framework that enables server-side rendering, routing, and more for React-based web applications.
- **FaceAPI**: FaceAPI is a JavaScript library built on top of TensorFlow.js that provides access to powerful face detection and recognition models.
- **Netlify**: Netlify is a platform that simplifies the process of deploying and hosting web applications.

## Getting Started

To run this project locally, follow these steps:

1. Clone this repository to your local machine.
   ```bash
   git clone https://github.com/your-username/faceapi-nextjs.git
2. Navigate into the project directory.
    ```bash
   cd faceapi-nextjs
3. Install dependencies using npm 
    ```bash
   npm install
4. Start the development server.
    ```bash
   npm run dev
5. Open your browser and visit http://localhost:3000 to view the application.

## Usage

This application allows users to perform various facial recognition tasks such as:

- Detecting faces in an image.
- Analyzing facial expressions (happy, sad, angry, etc.).
- Recognizing faces and identifying individuals.

Once facial data is captured, it is stored in JSON format. Upon subsequent runs of the application, this stored data can be utilized to identify faces by name.
