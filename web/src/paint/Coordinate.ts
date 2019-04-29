import { Position, addVec2, mulVec2, subVec2, inverseYVec2, divVec2, Vec2 } from "./Common";

/*
 * # 座標系の種類
 * ## Canvas座標系
 * Canvas(画像)の座標系
 * Canvasの左上が(0,0)、 xは右方向に増加、yは下方向に増加
 * 単位はピクセル
 * 
 * ## View座標系
 * CanvasViewの座標系
 * CanvasViewの中心が(0, 0)、 xは右方向に増加、yは上方向に増加
 * 単位はピクセル
 * 
 * ## Viewport座標系
 * GPURendererの座標系
 * 基本はView座標で左上が(-1, 1)、右下が(１, -1)となるような座標系
 * 
 * # オフセットとスケール
 * オフセットは基本的にはView座標をベースにする
 * つまり、中心から何ピクセル移動したかを表す。
 * スケールは単純にx,y方向を同じ値だけ引き延ばす。
 * 計算は常にスケールをかけてからオフセットをかけるという順番で行われる。
 */

 /**
 * Canvas座標系からView座標系に変換する
 * @param pos Canvas座標系での位置
 * @param scale スケール
 * @param offset View座標系でのオフセット
 * @param canvasHalfSize Canvasのサイズの半分(CanvasSize / 2)
 */
export function canvasToViewCoord(pos: Vec2, scale: number, offset: Vec2, canvasHalfSize: Vec2): Vec2 {
    const p = inverseYVec2(subVec2(pos, canvasHalfSize));
    // スケールとオフセットを適用
    return addVec2(mulVec2(p, scale), offset);
}

 /**
 * View座標系からCanvas座標系に変換する
 * @param pos View座標系での位置
 * @param offset View座標系でのオフセット
 * @param offset スケール
 * @param canvasHalfSize Canvasのサイズの半分(CanvasSize / 2)
 */
export function viewToCanvasCoord(pos: Vec2, scale: number, offset: Vec2, canvasHalfSize: Vec2): Position {
    const p = divVec2(subVec2(pos, offset), scale);
    return  addVec2(canvasHalfSize, inverseYVec2(p));
}
