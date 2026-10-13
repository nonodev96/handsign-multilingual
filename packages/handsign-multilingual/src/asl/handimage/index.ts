import type { SignImage } from '../../types'
import ASign from './A.svg'
import AHand from './Ahand.svg'
import BSign from './B.svg'
import BHand from './Bhand.svg'
import CSign from './C.svg'
import CHand from './Chand.svg'
import DSign from './D.svg'
import DHand from './Dhand.svg'
import ESign from './E.svg'
import EHand from './Ehand.svg'
import FSign from './F.svg'
import FHand from './Fhand.svg'
import GSign from './G.svg'
import GHand from './Ghand.svg'
import HSign from './H.svg'
import HHand from './Hhand.svg'
import ISign from './I.svg'
import IHand from './Ihand.svg'
import JSign from './J.svg'
import JHand from './Jhand.svg'
import KSign from './K.svg'
import KHand from './Khand.svg'
import LSign from './L.svg'
import LHand from './Lhand.svg'
import MSign from './M.svg'
import MHand from './Mhand.svg'
import NSign from './N.svg'
import NHand from './Nhand.svg'
import OSign from './O.svg'
import OHand from './Ohand.svg'
import PSign from './P.svg'
import PHand from './Phand.svg'
import QSign from './Q.svg'
import QHand from './Qhand.svg'
import RSign from './R.svg'
import RHand from './Rhand.svg'
import SSign from './S.svg'
import SHand from './Shand.svg'
import TSign from './T.svg'
import THand from './Thand.svg'
import USign from './U.svg'
import UHand from './Uhand.svg'
import VSign from './V.svg'
import VHand from './Vhand.svg'
import WSign from './W.svg'
import WHand from './Whand.svg'
import XSign from './X.svg'
import XHand from './Xhand.svg'
import YSign from './Y.svg'
import YHand from './Yhand.svg'
import ZSign from './Z.svg'
import ZHand from './Zhand.svg'

/** Each letter: the letter drawn (`sign`) and the hand making it (`hand`), as URLs */
export const images: Record<string, SignImage> = {
  A: { letter: 'A', sign: ASign, hand: AHand },
  B: { letter: 'B', sign: BSign, hand: BHand },
  C: { letter: 'C', sign: CSign, hand: CHand },
  D: { letter: 'D', sign: DSign, hand: DHand },
  E: { letter: 'E', sign: ESign, hand: EHand },
  F: { letter: 'F', sign: FSign, hand: FHand },
  G: { letter: 'G', sign: GSign, hand: GHand },
  H: { letter: 'H', sign: HSign, hand: HHand },
  I: { letter: 'I', sign: ISign, hand: IHand },
  J: { letter: 'J', sign: JSign, hand: JHand },
  K: { letter: 'K', sign: KSign, hand: KHand },
  L: { letter: 'L', sign: LSign, hand: LHand },
  M: { letter: 'M', sign: MSign, hand: MHand },
  N: { letter: 'N', sign: NSign, hand: NHand },
  O: { letter: 'O', sign: OSign, hand: OHand },
  P: { letter: 'P', sign: PSign, hand: PHand },
  Q: { letter: 'Q', sign: QSign, hand: QHand },
  R: { letter: 'R', sign: RSign, hand: RHand },
  S: { letter: 'S', sign: SSign, hand: SHand },
  T: { letter: 'T', sign: TSign, hand: THand },
  U: { letter: 'U', sign: USign, hand: UHand },
  V: { letter: 'V', sign: VSign, hand: VHand },
  W: { letter: 'W', sign: WSign, hand: WHand },
  X: { letter: 'X', sign: XSign, hand: XHand },
  Y: { letter: 'Y', sign: YSign, hand: YHand },
  Z: { letter: 'Z', sign: ZSign, hand: ZHand }
}
