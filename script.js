// ページの読み込みが完了した
window.addEventListener('load', () => {
  // パネル数をセット
  function setPanelNum() {
    // 現在のパラメータからパネル数を取得
    let panelNumFromParam = Number(new URL(location).searchParams.get("n"));

    // 初期値
    let panelNum = 4;

    // 取得したパネル数指定が範囲内なら更新
    if (3 <= panelNumFromParam && panelNumFromParam <= 30) {
      panelNum = panelNumFromParam;
    }

    // パネル数を指定し、メイン処理開始
    main(panelNum);
  }


  // URIに入力値をつけて遷移
  function setUri() {
    // パネル数指定の入力値をHTMLから取得
    let paraValue = Number(document.getElementById('panelnum').value);

    // ページ遷移
    const URI = new URL(location)
    URI.searchParams.set("n", paraValue);
    window.location.href = URI.toString();
  }


  // パネル数をパラメータから取得，変更
  setPanelNum();

  // ボタンクリックで入力値パネル数に更新
  document.querySelector('#panelnum-button').addEventListener('click', setUri);


  // メイン処理
  function main(panelNum) {
    // canvasの取得
    const canvas = document.querySelector('#draw-area');
    const gridCanvas = document.querySelector('#grid-area');
    // contextを使ってcanvasに絵を書いていく
    const context = canvas.getContext('2d');
    const contextGridLine = gridCanvas.getContext('2d');

    // パネル数 横
    const PANEL_NUM_X = panelNum;
    // パネル数 縦
    const PANEL_NUM_Y = panelNum;


    // パネル数ぶんの0埋め2次元配列を作成
    let ZERO_ARRAY = new Array(PANEL_NUM_Y);
    for (let row = 0; row < PANEL_NUM_Y; row++) {
      ZERO_ARRAY[row] = new Array(PANEL_NUM_X).fill(0);
    }

    // 基本フィールドの作成
    let field = JSON.parse(JSON.stringify(ZERO_ARRAY));

    // パネルごとの長さ
    const PLUS_NUM_X = canvas.offsetWidth / PANEL_NUM_X;
    const PLUS_NUM_Y = canvas.offsetHeight / PANEL_NUM_Y;

    // マウスがドラッグされているか(クリックされたままか)判断するためのフラグ
    let isDrag = false;
    // グリッド線があるかどうか
    let isgridLineOn = false;
    // 非表示機能ボタンとして機能するか(falseだと表示させる機能を持つようになる)
    let isHideButton = true;
    // プレイ中か
    let isPlaying = false;
    // 死滅したor固定されたか
    let isEnd = false;



    // 引数の場所にあるパネルの周囲1パネルの範囲に1(生存パネル)がなんぼあるか
    function countNearLiving(fieldY, fieldX) {
      // カウント用変数
      let count = 0;
      for (let i = -1; i < 2; i++) {
        // フィールドの範囲外は処理を飛ばす
        if ((fieldY == 0 && i == -1) || (fieldY == PANEL_NUM_Y - 1 && i == 1)) {
          continue;
        }
        for (let j = -1; j < 2; j++) {
          // フィールドの範囲外は処理を飛ばす
          if ((fieldX == 0 && j == -1) || (fieldX == PANEL_NUM_X - 1 && j == 1)) {
            continue;
          }
          // 9パネルすべてをカウント
          count += field[fieldY + i][fieldX + j];
        }
      }

      // 自身のフィールド値のため
      let me = 0;
      // 自パネルが生存しているならそのぶんはカウントしない(countから自分を引く)
      if (field[fieldY][fieldX] != 0) {
        me = field[fieldY][fieldX];
      }

      return count - me;
    }


    // 次の世代を求める
    const calNextLife = async () => {
      // 次世代のフィールドのため
      let fieldNext = JSON.parse(JSON.stringify(field));

      // 現在のフィールドの全パネルについて
      for (let i = 0; i < field.length; i++) {
        for (let j = 0; j < field[0].length; j++) {
          // 周囲1パネルの生存数
          let nearLivingNum = countNearLiving(i, j);

          // 生存数に応じて次世代がどうなるか変わる
          if (field[i][j] == 0 && nearLivingNum == 3) {
            // 生誕
            fieldNext[i][j] = 1;
          } else if (field[i][j] == 1 && (nearLivingNum <= 1 || nearLivingNum >= 4)) {
            // 過疎 or 過密 (死)
            fieldNext[i][j] = 0;
          } else {
            // 生存（そのまま）
          }
        }
      }

      // 現在のフィールド状態から継続か否かが決定する
      if (JSON.stringify(field) === JSON.stringify(ZERO_ARRAY)) {
        // 全員死滅時
        isPlaying = false;
        isEnd = true;
        // 内部フィールド配列とcanvasをゼロクリア
        clear();
        // ボタンに結果を表示
        document.getElementById("play-button").innerHTML = "滅亡した";
        // すぐにPLAYに変わるといけないので、1.5秒(1500 ms)待つ
        setTimeout(() => {
          document.getElementById("play-button").innerHTML = "PLAY";
        }, 1500);

      } else if (JSON.stringify(field) === JSON.stringify(fieldNext)) {
        // 固定された時
        isPlaying = false;
        isEnd = true;
        // ボタンに結果を表示
        document.getElementById("play-button").innerHTML = "固定された";
        setTimeout(() => {
          document.getElementById("play-button").innerHTML = "PLAY";
        }, 1500);

      } else {
        // それ以外はなにもせず処理を続行する
      }

      // フィールド配列に次世代のフィールド状態を反映
      field = JSON.parse(JSON.stringify(fieldNext));
    };


    // canvas描画処理

    // 直前に描いたときのパネル位置を格納
    let xIdxOld = null;
    let yIdxOld = null;


    // カーソル位置を受け取り，そこが属するパネルを塗りつぶす
    // フィールド配列の書き換えも行う
    function drawFillBox(x, y) {

      // カーソル位置がどこのパネルに属するか
      // OR 演算は、小数切り捨てのため
      let xIdx = x / PLUS_NUM_X | 0;
      let yIdx = y / PLUS_NUM_Y | 0;

      // 直前に描いたパネルとカーソル位置が一致しないなら描く
      if (xIdx != xIdxOld || yIdx != yIdxOld) {
        // 属するパネルが0なら1とする
        if (field[yIdx][xIdx] == 0) {
          // フィールド配列を書き換え
          field[yIdx][xIdx] = 1;
          // 四角形描画
          context.fillRect(xIdx * PLUS_NUM_X, yIdx * PLUS_NUM_Y, PLUS_NUM_X, PLUS_NUM_Y);
        } else {
          // 属するパネルが0でないなら0を描く（消す）
          field[yIdx][xIdx] = 0;
          // 四角形のサイズで消す
          context.clearRect(xIdx * PLUS_NUM_X, yIdx * PLUS_NUM_Y, PLUS_NUM_X, PLUS_NUM_Y);
        }

        // 描いたら位置情報を更新
        xIdxOld = xIdx;
        yIdxOld = yIdx;
      }
    }

    // fieldから四角を作成描画
    function fillAllBoxFromArray() {
      // 全てのフィールド要素について
      for (let i = 0; i < PANEL_NUM_Y; i++) {
        for (let j = 0; j < PANEL_NUM_X; j++) {
          // 0でなかったら描画
          if (field[i][j] != 0) {
            context.fillRect(j * PLUS_NUM_X, i * PLUS_NUM_Y, PLUS_NUM_X, PLUS_NUM_Y);
          }
        }
      }
    }

    // カーソルで描く
    function draw(x, y) {
      // マウスがドラッグされていなかったら処理を中断する。
      if (!isDrag) {
        return;
      }
      // カーソル位置は画面の左上が原点だけど，キャンバスで扱うのはキャンバスの左上が原点座標なので，差分を吸収する
      y = y - canvas.offsetTop;
      x = x - canvas.offsetLeft;
      // カーソル位置に属するパネルを描く
      drawFillBox(x, y);
    }

    // canvas上に書いた絵を全部消し，配列もゼロ埋めする
    function clear() {
      // PLAY中にボタン押されたらPLAY終了(中断処理)
      if (isPlaying) {
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
      // グリッド線書かれてないなら
      if (!isgridLineOn) {
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
        // 書けました
        isgridLineOn = true;
      }
    }


    // グリッド線を消す
    function clearGridLine() {
      contextGridLine.clearRect(0, 0, canvas.width, canvas.height);
      // グリッド線なしに
      isgridLineOn = false;
    }


    // グリッド線を描画するか消すか，ボタン1つで機能するように
    function modifyGridLine() {
      // hideButtonとされるとき
      if (isHideButton) {
        // hideButtonとして機能
        clearGridLine();
        // 次回はhideButtonではなくなる
        isHideButton = false;
        document.getElementById("grid-button").innerHTML = "ShowGrid";
        return;
      } else {
        // hideButtonでないとき
        // hideButtonでないもの(drawbutton)として機能
        drawGridLine();
        document.getElementById("grid-button").innerHTML = "HideGrid";
        // 次回はhideButtonとなる
        isHideButton = true;
      }
    }


    // マウスのドラッグを開始したらisDragをtrueにしてdraw関数内で描画処理が途中で止まらないようにする
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
        setTimeout(() => { resolve(msec) }, msec);
      });
    };


    // play時の処理
    const play = async () => {
      // PLAY中にボタン押されたらPLAY終了(中断処理)
      if (isPlaying) {
        isPlaying = false;
        isEnd = false;
        document.getElementById("play-button").innerHTML = "PLAY";
        return;
      }
      // gameplay flag
      isPlaying = true;
      document.getElementById("play-button").innerHTML = "PLAYING...";

      // 終わらない限り
      while (!isEnd) {
        // もしもの中断処理
        if (!isPlaying) return;
        
        // field配列を次の世代に更新
        calNextLife();
        // 描画
        // 現在の描画図形を削除
        remove();
        // field配列から図形を描画
        fillAllBoxFromArray();
        // ちょっと待つ
        await wait(1000);
      }

      // 初期化
      isEnd = false;
    };
    

    // 色変更
    context.fillStyle = 'rgb(0,0,0)';

    // gridLineは描いとく
    drawGridLine();


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