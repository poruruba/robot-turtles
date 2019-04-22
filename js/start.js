'use strict';

var vue_options = {
    el: "#top",
    data: {
        progress_title: '',

        card_info_list: card_info_list,
        card_list: [],
        block_map: [],
        block_selecting_item: 0,
        player_angle: 0,
        block_info_list: block_info_list,
        game_state: 0,
        result_image: '',
        result_message: '',
        result_reason: '',
        map_json: ''
    },
    computed: {
    },
    methods: {
        //ゲーム盤操作部を初期化します。
        game_init: function(){
            //マップ情報を生成します。
            var config = {
                map: []
            };
            for( var j = 0 ; j < SLOT_NUM ; j++ ){
                config.map[j] = [];
                for(var i = 0 ; i < SLOT_NUM ; i++ ){
                    switch( this.block_map[j][i] ){
                        case 1:
                        case 2:
                        case 3:
                        case 4:
                            config.map[j][i] = block_info_list[this.block_map[j][i]].type;
                            break;
                        case 5:{
                            config.player = {
                                x : i,
                                y : j,
                                angle: Number(this.player_angle)
                            };
                            config.map[j][i] = null;
                            break;
                        }
                        case 6:{
                            config.goal = {
                                x : i,
                                y : j
                            };
                            config.map[j][i] = null;
                            break;
                        }
                        default:
                            config.map[j][i] = null;
                            break;
                    }
                }
            }
            if( !config.player || !config.goal ){
                alert('プレイヤまたはゴールが設定されていません。');
                return;
            }

            // 次回またマップ情報を復元できるようにCookiesに保存しておきます。
            Cookies.set('block_map', JSON.stringify({
                block_map : this.block_map, player_angle: Number(this.player_angle)
            } ));

            config.div = 'phaser_canvas';  //id=phaser_canvasのところにゲーム盤を表示します。
            this.game_state = 1;
            game_initialize(config);
        },
        player_start: async function(){
            if( this.card_list.length <= 0 ){
                alert('カードを加えてください。');
                return;
            }

            // 次回またマップ情報を復元できるようにCookiesに保存しておきます。
            Cookies.set('block_map', JSON.stringify({
                block_map : this.block_map, player_angle: Number(this.player_angle), card_list: this.card_list
            } ));

            // カード情報から1枚ずつゲーム盤操作部に操作要求を投げます。
            this.game_state = 2;
            var ret = null;
            for( var i = 0 ; i < this.card_list.length ; i++ ){
                ret = await player_move(this.card_info_list[this.card_list[i]].direct);
                // もし途中でゲームおーばだった場合はループを抜けます。
                if( ret.over )
                    break;
            }

            // すべてのカードを使ったので、終了します。
            game_over();
            if( ret && !ret.over && ret.type == 'goal' ){
                // ゴールに行きついていたら成功です。
                this.game_state = 3;
                this.result_message = 'おめでとう！';
                this.result_reason = 'ゴールにたどり着き宝石を手に入れました。';
                this.result_image = 'assets/congraturations.png';
                this.dialog_open('#result-dialog');
            }else{
                // ゴールに行きついていない場合は失敗です。
                this.game_state = 4;
                this.result_message = '残念';
                this.result_image = 'assets/failure.png';
                if( ret && ret.over )
                    this.result_reason = ret.reason;
                else
                    this.result_reason = 'ゴールにたどり着けませんでした。';
                this.dialog_open('#result-dialog');
            }
        },
        // ブロックを選択しました。
        block_select: function(x, y){
            this.block_map[y][x] = this.block_selecting_item;
            this.block_map = JSON.parse(JSON.stringify(this.block_map));
        },
        // 選んだカードリストをリセットします。
        card_list_reset: function(){
            this.card_list = [];
        },
        // 選んだカードの一部をリストから抜きます。
        card_remove: function(index){
            this.card_list.splice(index, 1);
        },
        // 順序リストに選んだカードを追加します。
        card_select: function(card){
            this.card_list.push(card);
            this.dialog_close('#card-add');
        },
        // 保持しておいたCookieからマップ情報を復元します。
        cookie_reload: function(){
            var temp = Cookies.get('block_map');
            if( !temp )
                return;
            this.map_load(JSON.parse(temp));
        },
        // JSONからマップ情報を復元します。
        json_load: function(){
            this.dialog_close('#map-dialog');
            var map = JSON.parse(this.map_json);
            this.map_load(map);
        },
        // マップ情報復元の共通関数
        map_load: function(map){
            if( !map || !map.block_map || map.block_map[0] == undefined || map.block_map[0][0] == undefined ){
                alert('フォーマットエラー');
                return;
            }
            this.block_map = map.block_map;
            this.player_angle = map.player_angle;
            if( map.card_list && map.card_list[0] != undefined )
                this.card_list = map.card_list;
        },
        // マップ情報をリセットします。
        map_list_reset: function(){
            this.block_map = Array(SLOT_NUM);
            for( var i = 0 ; i < this.block_map.length ; i++ ){
                this.block_map[i] = Array(SLOT_NUM);
                this.block_map[i].fill(0);
            }
            this.player_angle = 0;
        },
        // マップ情報をJSON形式にしてダイアログ表示します。
        map_dialog: function(){
            this.map_json = JSON.stringify({
                block_map : this.block_map, player_angle: this.player_angle, card_list: this.card_list
            });
            this.dialog_open('#map-dialog');
        },
    },
    created: function(){
    },
    mounted: function(){
        proc_load();

        // マップ情報を初期化します。
        this.map_list_reset();
    }
};
vue_add_methods(vue_options, methods_utils);
var vue = new Vue( vue_options );
