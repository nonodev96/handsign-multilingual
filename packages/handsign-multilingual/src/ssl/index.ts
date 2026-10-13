import type { HandSignLang } from '#/types'
import { aSign } from './A'
import { bSign } from './B'
import { cSign } from './C'
import { dSign } from './D'
import { eSign } from './E'
import { fSign } from './F'
import { gSign } from './G'
import { hSign } from './H'
import { iSign } from './I'
import { jSign } from './J'
import { kSign } from './K'
import { lSign } from './L'
import { mSign } from './M'
import { nSign } from './N'
import { oSign } from './O'
import { pSign } from './P'
import { qSign } from './Q'
import { rSign } from './R'
import { sSign } from './S'
import { tSign } from './T'
import { uSign } from './U'
import { vSign } from './V'
import { wSign } from './W'
import { xSign } from './X'
import { ySign } from './Y'
import { zSign } from './Z'

// LL, Ñ and RR share the handshape of L, N and R and differ in the movement: as still poses (GestureDescription) they
// would be identical, so they are motions. LL and RR move to the side of the hand that signs (left in the frame the letters
// are described in, a right hand in a non-mirrored image); Ñ goes from side to side
const HandSignsSSL: HandSignLang = {
  motions: [
    { letter: 'LL', base: 'L', movement: { type: 'shift', direction: 'left' } },
    { letter: 'Ñ', base: 'N', movement: { type: 'shake' } },
    { letter: 'RR', base: 'R', movement: { type: 'shift', direction: 'left' } }
  ],
  signs: {
    aSign,
    bSign,
    cSign,
    dSign,
    eSign,
    fSign,
    gSign,
    hSign,
    iSign,
    jSign,
    kSign,
    lSign,
    mSign,
    nSign,
    oSign,
    pSign,
    qSign,
    rSign,
    sSign,
    tSign,
    uSign,
    vSign,
    wSign,
    xSign,
    ySign,
    zSign
  }
}

export { HandSignsSSL }
