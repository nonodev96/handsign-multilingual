import { getBackend, setBackend, } from "../tensorflow_singleton";

// import * as tf from '@tensorflow/tfjs';
// jest.genMockFromModule('@tensorflow/tfjs');

import * as tfjs from "@tensorflow/tfjs";
import * as tfjsnode from "@tensorflow/tfjs-node";
import * as fp from 'fingerpose'
import * as handsignMultiligual from '../../dist'


type Keypoint3D = {
    x: number;
    y: number;
    z: number;
}

describe('tensorflow singleton', () => {
    describe('getBackend', () => {
        it('should throw an error if tensorflow has not been set', () => {
            expect(getBackend.bind(null)).toThrowError(/Looks like you are/);
        });
    });
    describe('setBackend', () => {
        const tensorflowMockBackend = tfjsnode;
        it('should set a tf singleton', () => {
            setBackend(tensorflowMockBackend);
            expect(getBackend()).toBe(tensorflowMockBackend);
        });
    });
});