import { sum } from '../src/index';

describe('testing index file', () => {
    it('check sum', () => {
        expect(sum(1, 1)).toBe(2);
        expect(sum(1, -1)).toBe(0);
    });
});