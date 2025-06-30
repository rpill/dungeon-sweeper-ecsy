import generator from '@rtpa/phaser-bitmapfont-generator';

(async () => {
    await generator.TextStyle2BitmapFont({
        // path: './public/assets/fonts',
        // fileName: 'pixel-azure-bonds',
        // textSet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!?+-=<>:;()[]{}@#$%^&*~ ',
        textStyle: {
            fontFamily: 'Pixel Azure Bonds',
            fontSize: '10px',
            color: '#ffffff',
        },
        antialias: false,
    });

    process.exit(0);
})();