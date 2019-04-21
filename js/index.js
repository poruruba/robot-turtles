'use strict';

// パラメータ
const SPRITE_SIZE = 80;
const BLOCK_SIZE = 397;
const PLAYER_SIZE = 378;
const SLOT_NUM = 8;
const MOVE_DURATION = 1000;

// グローバル変数
var g_game = null;
var g_map = null;
var g_player = null;
var g_goal = null;

// ゲームオブジェクト
var player;
var goal;
var stars;
var bombs;
var blocks;
var goals;
var blocks_jumpable;
var platforms;

// ゲーム情報の初期化
function game_initialize(config){
    var game_config = {
        type: Phaser.AUTO,
        width: SLOT_NUM * SPRITE_SIZE,
        height: SLOT_NUM * SPRITE_SIZE,
        physics: {
            default: 'arcade',
            arcade: {
                debug: false,
            }
        },
        scene: {
            preload: preload,
            create: create,
            update: update
        }
    };
    g_map = config.map;
    g_player = config.player;
    g_goal = config.goal;
    game_config.parent = config.div;
    
    // PhaserGameの生成
    g_game = new Phaser.Game(game_config);
}

// スプライトインデックスと座標の変換
function index2pos(index){
    return SPRITE_SIZE * index + SPRITE_SIZE /2;
}

// Phasr.Gameで設定したので、Phaserから呼ばれる
function preload (){
    //画像情報の事前ロード
    this.load.image('background', 'assets/background.png');
    this.load.image('block_box', block_info_list[1].image);
    this.load.image('block_ice', block_info_list[2].image);
    this.load.image('block_puddle', block_info_list[3].image);
    this.load.image('block_wall', block_info_list[4].image);
    this.load.image('player', block_info_list[5].image);
    this.load.image('goal', block_info_list[6].image);
}

// Phasr.Gameで設定したので、Phaserから呼ばれる
function create (){
    // 背景画像の設定
    this.add.image(0, 0, 'background').setOrigin(0, 0);

    // スプライト境界線の描画
    var g = this.add.graphics();
    g.clear();
    g.lineStyle(1, 0x0000ff);
    g.setPosition(0, 0);
    for( var i = 1 ; i < SLOT_NUM ; i++ ){
        g.moveTo(SPRITE_SIZE * i, 0);
        g.lineTo(SPRITE_SIZE * i, SPRITE_SIZE * SLOT_NUM - 1);
        g.moveTo(0, SPRITE_SIZE * i);
        g.lineTo(SPRITE_SIZE * SLOT_NUM - 1, SPRITE_SIZE * i);
    }
    g.strokePath();

    platforms = this.physics.add.staticGroup();

    blocks = this.physics.add.group();
    blocks_jumpable = this.physics.add.group();

    // マップ情報の登録
    for( var j = 0 ; j < SLOT_NUM ; j++ ){
        if( !g_map[j] )
            continue;
        for( var i = 0 ; i < SLOT_NUM ; i++ ){
            switch(g_map[j][i]){
                case 'box':
                case 'ice':
                case 'wall':
                    var block = blocks.create(index2pos(i), index2pos(j), 'block_' + g_map[j][i]).setScale(SPRITE_SIZE/BLOCK_SIZE);
                    g_map[j][i] = {
                        type: g_map[j][i],
                        object: block
                    };
                    break;
                case 'puddle':
                    var block = blocks_jumpable.create(index2pos(i), index2pos(j), 'block_' + g_map[j][i]).setScale(SPRITE_SIZE/BLOCK_SIZE);
                    g_map[j][i] = {
                        type: g_map[j][i],
                        object: block
                    };
                    break;
            }
        }
    }

    // ゴールの登録
    goals = this.physics.add.group();
    goal = goals.create(index2pos(g_goal.x), index2pos(g_goal.y), 'goal').setScale(SPRITE_SIZE/BLOCK_SIZE);
    g_map[g_goal.y][g_goal.x] = {
        type: 'goal',
        object: goal
    };

    // プレイヤの登録
    player = this.physics.add.group().create(index2pos(g_player.x), index2pos(g_player.y), 'player').setScale(SPRITE_SIZE/BLOCK_SIZE);
    this.tweens.add({
        targets: player,
        angle: g_player.angle,
        duration: 1,
    });

    // 衝突検知の登録
    player.setCollideWorldBounds(true);

    this.physics.add.collider(player, platforms);
    this.physics.add.collider(blocks, platforms);
    this.physics.add.collider(blocks_jumpable, platforms);
    this.physics.add.collider(goals, platforms);

    this.physics.add.collider(player, blocks, hitBomb, null, this);
    this.physics.add.collider(player, blocks_jumpable, hitJumpable, null, this);
    this.physics.add.collider(player, goals, hitGoal, null, this);
}

// 状態管理
var State = {
    IDLE: 0,
    MOVING: 1,
    ROLLING: 2,
};
var g_state = State.IDLE;

var Request = {
    IDLE: 0,
    JUMP: 1,
    LASER: 2,
    TURN_RIGHT: 5,
    TURN_LEFT: 6,
    GO: 7
};
var g_request = Request.IDLE;

var g_resolve = null;
var g_reject = null;

var gameEnd = false;
var gameOver = false;
var gameOverReason = '';

function game_over(){
    gameEnd = true;
}

// フロントエンドからのプレイヤ移動要求
async function player_move(direction){
    if( g_request != Request.IDLE ){
        throw 'now moving';
    }

    return new Promise((resolve, reject) =>{
        // 要求情報をグローバル変数にセット
        g_resolve = resolve;
        g_reject = reject;        
        g_request = direction;
    });
}

// 移動完了後のコールバック関数
function g_callback_player_move_complete(){
    if( gameOver ){
        player.setTint(0xff0000);
    }
    
    g_resolve({
        x: g_player.x,
        y: g_player.y,
        angle: player.angle,
        over: gameOver,
        reason: gameOverReason,
        type: g_map[g_player.y][g_player.x] ? g_map[g_player.y][g_player.x].type : null
    });
    g_request = Request.IDLE;
    g_state = State.IDLE;
}

// 次の移動先の計算
function next_dir(count = 1){
    var dir = {
        x: g_player.x,
        y: g_player.y
    };

    if( player.angle == 270 || player.angle == -90 ){
        dir.x -= count;
    }else
    if( player.angle == 180 || player.angle == -180){
        dir.y += count;
    }else
    if( player.angle == 90 || player.angle == -270){
        dir.x += count;
    }else{
        dir.y -= count;
    }

    // 枠をはみ出ていないかの確認
    if( dir.x < 0 || dir >= SLOT_NUM || dir.y < 0 || dir.y >= SLOT_NUM)
        return null;
    
    return dir;
}

//現在位置の更新
function update_dir(dir){
    g_player.x = dir.x;
    g_player.y = dir.y;

    return dir;
}

// ゲームの再描画要求
function update (){
    if( gameEnd ){
        this.physics.pause();
        return;
    }
    if (gameOver){
        return;
    }

    if( g_state == State.IDLE ){
        switch( g_request ){
            //レーザー光線
            case Request.LASER: {
                var dir = next_dir();
                if( dir == null ){
                    g_callback_player_move_complete();
                    return;
                }
                // 氷の場合はオブジェクトを削除する
                if( g_map[dir.y][dir.x] != null && g_map[dir.y][dir.x].type == 'ice' ){
                    g_map[dir.y][dir.x].object.disableBody(true, true);
                    g_map[dir.y][dir.x] = null;
                }
                g_callback_player_move_complete();
                break;
            }
            //ジャンプ
            case Request.JUMP: {
                var dir = next_dir();
                if( dir == null || (g_map[dir.y][dir.x] != null && g_map[dir.y][dir.x].type != 'puddle' )){
                    g_callback_player_move_complete();
                    return;
                }

                // ジャンプ先の確認
                var dir_jumped = next_dir(2);
                if( dir_jumped == null || (g_map[dir_jumped.y][dir_jumped.x] != null && g_map[dir_jumped.y][dir_jumped.x].type != 'goal') ){
                    gameOverReason = 'ジャンプした先でけがをしました。';
                    gameOver = true;
                    g_callback_player_move_complete();
                    return;
                }

                g_state = State.MOVING;
                update_dir(dir_jumped);
                this.tweens.add({
                    targets: player,
                    x: index2pos(dir_jumped.x),
                    y: index2pos(dir_jumped.y),
                    duration: MOVE_DURATION,
                    onComplete: g_callback_player_move_complete
                });
                break;
            }
            //右へ向く
            case Request.TURN_RIGHT: {
                g_state = State.ROLLING;
                this.tweens.add({
                    targets: player,
                    angle: '+=90',
                    duration: MOVE_DURATION,
                    onComplete: g_callback_player_move_complete
                });
                break;
            }
            //左へ向く
            case Request.TURN_LEFT: {
                g_state = State.ROLLING;
                this.tweens.add({
                    targets: player,
                    angle: '-=90',
                    duration: MOVE_DURATION,
                    onComplete: g_callback_player_move_complete
                });
                break;
            }
            // 直進する
            case Request.GO: {
                var dir = next_dir();
                if( dir == null ){
                    g_callback_player_move_complete();
                    return;
                }

                // 目の前が箱だった場合
                if( g_map[dir.y][dir.x] != null && g_map[dir.y][dir.x].type == 'box' ){
                    var dir_pushed = next_dir(2);
                    // 1つ先に何かある場合は動かさない
                    if( dir_pushed == null || g_map[dir_pushed.y][dir_pushed.x] != null ){
                        g_callback_player_move_complete();
                        return;
                    }
                    // 箱を動かす
                    this.tweens.add({
                        targets: g_map[dir.y][dir.x].object,
                        x: index2pos(dir_pushed.x),
                        y: index2pos(dir_pushed.y),
                        duration: MOVE_DURATION,
                    });
                    // マップ情報の更新
                    g_map[dir_pushed.y][dir_pushed.x] = g_map[dir.y][dir.x];
                    g_map[dir.y][dir.x] = null;
                }
    
                // プレイヤを動かす
                g_state = State.MOVING;
                update_dir(dir);
                this.tweens.add({
                    targets: player,
                    x: index2pos(dir.x),
                    y: index2pos(dir.y),
                    duration: MOVE_DURATION,
                    onComplete: g_callback_player_move_complete
                });
                break;
            }
        }
    }
}

// 衝突検知
function hitBomb (player, bomb){
    console.log('hitBomb');
    gameOverReason = 'ぶつかってけがをしました。';
    gameOver = true;
}

// 衝突検知(水たまり)
function hitJumpable (player, bomb){
    console.log('hitJumpable')
    if( g_request == Request.JUMP )
        return;

    gameOverReason = 'ぶつかってけがをしました。';
    gameOver = true;
}

// 衝突検知(ゴール)
function hitGoal (player, bomb){
    console.log('hitGoal')
}
