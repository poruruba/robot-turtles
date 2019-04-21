'use strict';

const card_info_list = [
    {
        type: 'left',
        title: '左に向く',
        image: 'assets/blue_dir_left.png',
        direct: Request.TURN_LEFT
    },
    {
        type: 'go',
        title: '前へ進む',
        image: 'assets/blue_dir_go.png',
        direct: Request.GO
    },
    {
        type: 'right',
        title: '右に向く',
        image: 'assets/blue_dir_right.png',
        direct: Request.TURN_RIGHT
    },
    {
        type: 'jump',
        title: 'ジャンプする',
        image: 'assets/blue_jump.png',
        direct: Request.JUMP
    },
    {
        type: 'laser',
        title: 'レーザーを発射する',
        image: 'assets/blue_laser.png',
        direct: Request.LASER
    }
];

const block_info_list = [
    {
        title: 'Blank',
        type: 'blank',
        image: "assets/block_blank.png",
    },
    {
        title: 'Box',
        type: 'box',
        image: "assets/block_box.png",
    },
    {
        title: 'Ice',
        type: 'ice',
        image: "assets/block_ice.png",
    },
    {
        title: 'Puddle',
        type: 'puddle',
        image: "assets/block_puddle.png",
    },
    {
        title: 'Wall',
        type: 'wall',
        image: "assets/block_wall.png",
    },
    {
        title: 'Player',
        type: 'player',
        image: "assets/blue_player.png",
    },
    {
        title: 'Goal',
        type: 'goal',
        image: "assets/blue_goal.png",
    }
];