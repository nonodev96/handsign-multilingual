import * as tf from "@tensorflow/tfjs-node";

test("should be able to train a model", () => {
    const model = tf.sequential();
    model.add(tf.layers.dense({ units: 1, inputShape: [1] }));

    model.compile({ loss: "meanSquaredError", optimizer: "sgd" });

    const xs = tf.tensor2d([1, 2, 3, 4], [4, 1]);
    const ys = tf.tensor2d([1, 3, 5, 7], [4, 1]);

    return model.fit(xs, ys, { epochs: 10 }).then(() => {
        model.predict(tf.tensor2d([5], [1, 1])).print();
    });
});

/*
     // INIT
        const { HandSignsSSL } = handsignMultiligual
        const signs = Object.values(HandSignsSSL.signs)
        const gestureEstimator = new fp.GestureEstimator([
            ...signs
        ])
        const model = handPoseDetection.SupportedModels.MediaPipeHands
        const detectorConfig: handPoseDetection.MediaPipeHandsMediaPipeModelConfig = {
            runtime: 'mediapipe', // or 'tfjs',
            solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands',
            modelType: 'full'
        }
        // const _modelDetector = await handPoseDetection.createDetector(model, detectorConfig)

        const width = 100;
        const height = 100;
        const data = new Uint8ClampedArray(width * height * 4); // RGBA values
        const imageData = new ImageData(data, width, height);

        console.log({ imageData })
        // const input = tf.browser.fromPixels(imageData)
        const input = imageData
        // PREDICTIONS
        // const predictions = await _modelDetector.estimateHands(input)
        // console.log({ predictions });

        // for (const hand of predictions) {
        //     const landmark = hand.keypoints.map(({ x, y, z }) => [x, y, z])
        //     const keypoints3D = hand.keypoints3D
        //     if (keypoints3D) {
        //         const landmark3D = keypoints3D.map(({ x, y, z }) => {
        //             return { x, y, z } as Keypoint3D
        //         })
        //         const estimatedGestures = gestureEstimator.estimate(landmark3D, 8.5)
        //         console.log({ estimatedGestures })
        //     }
        // }




*/