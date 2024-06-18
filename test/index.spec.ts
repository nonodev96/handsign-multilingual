import { add } from '../src/index';

describe('testing index file', () => {
    it('empty string should result in zero', () => {
        expect(add(1, 1)).toBe(2);
        expect(add(1, -1)).toBe(0);
    });
});