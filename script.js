// ページの読み込みが完了した
window.addEventListener('load', () => {
  // マスサイズをセット
  function setSizeNum() {
    let param = Number(new URL(location).searchParams.get("n"));
    let sizeNum = 4;  // 初期値
    if (3 <= param && param <= 30) {
      sizeNum = param;
    }
    main(sizeNum);
  }

  // URIに入力値をつけて遷移
  function setUri() {
    let paraValue = Number(document.getElementById('sizenum').value);
    const URI = new URL(location)
    URI.searchParams.set("n", paraValue);
    window.location.href = URI.toString(); // 遷移
  }
  
  // マスサイズをパラメータから取得，変更
  setSizeNum();
  
  // ボタンクリックで入力値マス数に更新
  document.querySelector('#sizenum-button').addEventListener('click', setUri);
  
  // メイン処理
  function main(sizeNum) {
    const canvas = document.querySelector('#draw-area');
    const gridCanvas = document.querySelector('#grid-area');
    // contextを使ってcanvasに絵を書いていく
    const context = canvas.getContext('2d');
    const contextGridLine = gridCanvas.getContext('2d');

    const SIZE_X = sizeNum; // 配列サイズx とりあえず同じにする
    const SIZE_Y = sizeNum; // 配列サイズy

    
    // 配列サイズの0埋め配列を作成
    let ZERO_ARRAY = new Array(SIZE_Y);
    for (let row = 0; row < SIZE_Y; row++) {
      ZERO_ARRAY[row] = new Array(SIZE_X).fill(0);
    }
    
    // 基本フィールドの作成
    let field = JSON.parse(JSON.stringify(ZERO_ARRAY));
    
    const PLUS_NUM_X = canvas.offsetWidth / SIZE_X; // BOXごとの長さ
    const PLUS_NUM_Y = canvas.offsetHeight / SIZE_Y;
    
    // マウスがドラッグされているか(クリックされたままか)判断するためのフラグ
    let isDrag = false;
    let isgridLineOn = false; // グリッド線があるかどうか
    let isHideButton = true; // defaultは非表示機能ボタンとする
    let isPlaying = false; // プレイ中か
    let isEnd = false; // 死滅したor固定されたか
    
    

    // 引数のIDXの周囲1マスの範囲に1がなんぼあるか
    function countNearLiving(fieldY, fieldX) { // ret count
      let count = 0;
      for (let i = -1; i < 2; i++) {
        if ((fieldY == 0 && i == -1) || (fieldY == SIZE_Y-1 && i == 1)) {
          continue;
        }
        for (let j = -1; j < 2; j++) {
          if ((fieldX == 0 && j == -1) || (fieldX == SIZE_X-1 && j == 1)) {
            continue;
          }
          count += field[fieldY + i][fieldX + j];
        }
      }
      let me = 0;
      if (field[fieldY][fieldX] != 0) { // 自マスが生存しているならそのぶんはカウントしない(countから自分を引く)
        // me = field[fieldY][fieldX];
        me = field[fieldY][fieldX];
      }
      return count - me;
    }
    
    const calNextLife = async () => {
      // 次の世代を求める
      // nextgenarray
      let fieldNext = JSON.parse(JSON.stringify(field));

      for (let i = 0; i < field.length; i++) {
        for (let j = 0; j < field[0].length; j++) {
          // 周囲1マスの生存数
          let nearLivingNum = countNearLiving(i, j);
          if (field[i][j] == 0 && nearLivingNum == 3) { // 生誕
            fieldNext[i][j] = 1;
          } else if (field[i][j] == 1 && (nearLivingNum <= 1 || nearLivingNum >= 4)) { // 過疎 or 過密 (死)
            fieldNext[i][j] = 0;
          } else {
            // 生存（そのまま）
          }
        }
      }

      if (JSON.stringify(field) === JSON.stringify(ZERO_ARRAY)) { // 全員死滅
        isPlaying = false;
        isEnd = true;
        clear();
        document.getElementById("play-button").innerHTML = "滅亡した";
        await wait(1500);
        document.getElementById("play-button").innerHTML = "PLAY";
      }else if (JSON.stringify(field) === JSON.stringify(fieldNext)) { // 固定された
        isPlaying = false;
        isEnd = true;
        document.getElementById("play-button").innerHTML = "固定された";
        await wait(1500);
        document.getElementById("play-button").innerHTML = "PLAY";
      }
      // 反映
      field = JSON.parse(JSON.stringify(fieldNext));
    };
    
    // 直前に描いたときのマス位置を格納
    let xIdxOld = null;
    let yIdxOld = null;

    function drawFillBox(x, y) {
      // カーソル位置を受け取り，そこが属するマスを塗りつぶす
      // 配列の書き換えも行う

      // カーソル位置がどこのマスに属するか
      let xIdx = x / PLUS_NUM_X | 0; // 小数切り捨てのための OR 演算
      let yIdx = y / PLUS_NUM_Y | 0;
      if (xIdx != xIdxOld || yIdx != yIdxOld) { // 直前に描いたマスとカーソル位置が一致しないなら描く
        // 属するマス位置の配列を1に書き換え
        if (field[yIdx][xIdx] == 0) { // 属するマスが0なら1を描く
          field[yIdx][xIdx] = 1;
          context.fillRect(xIdx * PLUS_NUM_X, yIdx * PLUS_NUM_Y, PLUS_NUM_X, PLUS_NUM_Y); // 四角形描画
        } else { // 属するマスが0でないなら0を描く（消す）
          field[yIdx][xIdx] = 0;
          context.clearRect(xIdx * PLUS_NUM_X, yIdx * PLUS_NUM_Y, PLUS_NUM_X, PLUS_NUM_Y); // 四角形のサイズで消す
        }
        // 描いたら更新
        xIdxOld = xIdx;
        yIdxOld = yIdx;
      }
    }

    function fillAllBoxFromArray() {
      // fieldから四角を作成描画
      for (let i = 0; i < SIZE_Y; i++) {
        for (let j = 0; j < SIZE_X; j++) {
          if (field[i][j] != 0) { // 0でなかったら描画
            context.fillRect(j * PLUS_NUM_X, i * PLUS_NUM_Y, PLUS_NUM_X, PLUS_NUM_Y);
          }
        }
      }
    }

    // カーソルで描く
    function draw(x, y) {
      // マウスがドラッグされていなかったら処理を中断する。
      if(!isDrag) {
        return;
      }
      // カーソル位置は画面の左上が原点だけど，キャンバスで扱うのはキャンバスの左上が原点座標なので，差分を吸収する
      y = y - canvas.offsetTop;
      x = x - canvas.offsetLeft;
      // カーソル位置に属するマスを描く
      drawFillBox(x, y);
    }

    // canvas上に書いた絵を全部消し，配列もゼロ埋めする
    function clear() {
      if (isPlaying) { // PLAY中にボタン押されたらPLAY終了(中断処理)
        isPlaying = false;
        isEnd = false;
        document.getElementById("play-button").innerHTML = "PLAY";
        return;
      }
      // clear
      context.clearRect(0, 0, canvas.width, canvas.height);
      // 0埋め
      field = JSON.parse(JSON.stringify(ZERO_ARRAY));
    }

    // canvas上の図形を全部消すだけ
    function remove() {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }

    // グリッド線の描画
    function drawGridLine() {
      if (!isgridLineOn) { // グリッド線書かれてないなら
        // 縦線
        for (let i = 0; i < canvas.offsetWidth / PLUS_NUM_X | 0; i++) {
          contextGridLine.beginPath();
          contextGridLine.moveTo(i * PLUS_NUM_X, 0);
          contextGridLine.lineTo(i * PLUS_NUM_X, canvas.offsetHeight);
          contextGridLine.closePath();
          contextGridLine.stroke();
        }
        // 横線
        for (let i = 0; i < canvas.offsetHeight / PLUS_NUM_Y | 0; i++) {
          contextGridLine.beginPath();
          contextGridLine.moveTo(0, i * PLUS_NUM_Y);
          contextGridLine.lineTo(canvas.offsetHeight, i * PLUS_NUM_Y);
          contextGridLine.closePath();
          contextGridLine.stroke();
        }
        isgridLineOn = true; // 書けました
      }
    }

    // グリッド線を消す
    function clearGridLine() {
      contextGridLine.clearRect(0, 0, canvas.width, canvas.height);
      isgridLineOn = false; // グリッド線なしに
    }

    // グリッド線を描画するか消すか，ボタン1つで機能するように
    function modifyGridLine() {
      if (isHideButton) { // removebuttonとされるとき
        clearGridLine(); // removebuttonとして機能
        isHideButton = false; // removebuttonではなくなる
        document.getElementById("grid-button").innerHTML = "ShowGrid";
        return;
      }
      // removebuttonでないとき
      drawGridLine(); // removebuttonでないもの(drawbutton)として機能
      document.getElementById("grid-button").innerHTML = "HideGrid";
      isHideButton = true; // removebuttonとなる
    }

    // マウスのドラッグを開始したらisDragのフラグをtrueにしてdraw関数内で描画処理が途中で止まらないようにする
    function dragStart(event) {
      isDrag = true;
    }
    // マウスのドラッグが終了したら、もしくはマウスがcanvas外に移動したらisDragのフラグをfalseにしてdraw関数内でお絵かき処理が中断されるようにする
    function dragEnd(event) {
      isDrag = false;
    }

    // wait関数 msec待つ asyncの関数で使える
    const wait = (msec) => {
      return new Promise((resolve) => {
        setTimeout(() => {resolve(msec)}, msec);
      });
    };
    
    const play = async () => {
      if (isPlaying) { // PLAY中にボタン押されたらPLAY終了(中断処理)
        isPlaying = false;
        isEnd = false;
        document.getElementById("play-button").innerHTML = "PLAY";
        return;
      }
      // gameplay
      isPlaying = true;
      document.getElementById("play-button").innerHTML = "PLAYING...";
      while (!isEnd) {
        if (!isPlaying) return; // 中断処理
        // field配列を次の世代に更新
        calNextLife();
        // 描画
        remove(); // 現在の描画図形を削除
        fillAllBoxFromArray(); // field配列から図形を描画
        await wait(1000); // ちょっと待つ
      }
      document.getElementById("play-button").innerHTML = "PLAY";
      isEnd = false;
    };

    drawGridLine(); // gridLineは描いとく
        
    // マウス操作やボタンクリック時のイベント処理を定義する
    function initEventHandler() {
      

      const playButon = document.querySelector('#play-button');
      playButon.addEventListener('click', play);
      
      const clearButton = document.querySelector('#clear-button');
      clearButton.addEventListener('click', clear);
      
      const modifyGridLineButton = document.querySelector('#grid-button');
      modifyGridLineButton.addEventListener('click', modifyGridLine);

      canvas.addEventListener('mousedown', dragStart);
      canvas.addEventListener('mouseup', dragEnd);
      canvas.addEventListener('mouseout', dragEnd);
      canvas.addEventListener('mousemove', (event) => {
        draw(event.layerX, event.layerY);
      });
      canvas.addEventListener('mousedown', (event) => {
        draw(event.layerX, event.layerY);
      });
    }

    // イベント処理を初期化する
    initEventHandler();
  }
});