'use strict';
const mongoose = require('mongoose');
const Vote = mongoose.model('Votes');
const User = mongoose.model('Users');
const Award = mongoose.model('AwardEvents');
const Jimp = require('jimp');
const fs = require('fs')

const pictureRoute = `${appRoot}/assets/23i_render-template.jpg`;
const BLANK_THUMBNAIL = `${appRoot}/assets/data/nominees/no-picture.jpg`;

exports.createVotes = async function (req, res) {
    const {userId, votes} = req.body;
    const award = req.params.awardId;

    if (Array.isArray(votes)) {
        let promises = [];

        const user = await User.findById(userId);
        if (!user) res.status(404).json('User not found');

        const awardEvent = await Award.findById(award);
        if (!awardEvent) res.status(404).json('Award event not found');

        await votes.forEach((v) => {
            let newVote = new Vote({user, awardEvent, ...v})
            promises.push(newVote.save());
        })
        try {
            let result = await Promise.all(promises);
            if (!result) {
                return res.status(500).json({message: 'An error occurred in server when saving votes', flag: 3});
            }

            user.votes = [...user.votes, ...result.map(r => r._id)];

            let userRes = await user.save();
            if (!userRes) {
                return res.status(500).json({
                    message: 'Votes were saved but an error avoid them to be assign to an user',
                    flag: 1
                });
            }
            return res.status(201).json({
                message: "All votes were emitted and assigned",
                flag: 0,
            });

        } catch (error) {
            return res.status(500).json({message: 'An error occurred in server when saving votes', flag: 2});
        }
    }
    return res.status(400).json({message: "Content sent in a wrong format. Expected an array", flag: 4});
}

exports.renderImage = async function (req, res) {
    let user = await User.findById(req.params.userId);
    const username = (user) ? user.name : 'XXXXXX';

    let data = req.body.data;

    let filename = await renderer(data, username)

    const options = {
        // root: appRoot,
        dotfiles: 'deny',
        headers: {
            'x-timestamp': Date.now(),
            'x-sent': true,
        }
    }

    fs.access(filename, fs.F_OK, (err) => {
            if (err) {
                console.err(err);
                return res.status(500).json({'message': 'Error at generating the picture (maybe timeout)', err})
            }
            console.log("Success at rendering")
            res.sendFile(filename, options, function (error) {
                if (error) {
                    console.error("An error ocurren when sending data".bgRed, error);
                    res.status(500).json({message: 'Something went wrong at sending the rendered picture', error});
                }
                console.log("Picture sent successfully".black.bold.bgGreen);
                fs.unlink(filename, (err) => {
                    if (err) {
                        console.error(err)
                        return;
                    }
                    console.log(`File deleted: ${filename}`);
                })
            });
        }
    )
    ;
}

async function renderer(data, username) {
    console.log("Setting up configuration");
    const MAX_ROW = 5;
    const MAX_COL = 5;

    const CARD_W = 370;
    const CARD_H = 190;
    const CARDS_X_DISTANCE = 66;
    const CARDS_Y_DISTANCE = 25;

    const X_OFFSET = 47;
    const Y_OFFSET = 145;

    const THUMBNAIL_W = 136;
    const THUMBNAIL_H = 180;
    const THUMBNAIL_X_OFFSET = 6;
    const THUMBNAIL_Y_OFFSET = 5;


    console.log("Preparing rendering...");
    let promises = [];

    try {
        let pic = Jimp.read(pictureRoute);
        promises.push(pic);


        let fontTitle = Jimp.loadFont(`${appRoot}/assets/fonts/render_title.fnt`);
        let fontCategory = Jimp.loadFont(`${appRoot}/assets/fonts/card_title.fnt`);
        let fontName = Jimp.loadFont(`${appRoot}/assets/fonts/card_nominee.fnt`);
        let fontDesc = Jimp.loadFont(`${appRoot}/assets/fonts/card_movie.fnt`);
        promises.push(fontTitle, fontCategory, fontName, fontDesc,);
        let algo = await Promise.all(promises);
        pic = algo[0];
        fontTitle = algo[1];
        fontCategory = algo[2];
        fontName = algo[3];
        fontDesc = algo[4];


        if (pic) console.log("Template loaded");
        else {
            console.err("Error at loading template");
            return false;
        }

        let i = -1;
        console.log("Embedding items...")
        for (const vote of data) {
            i++;
            let c = i % MAX_ROW;
            let r = Math.floor(i / MAX_COL);

            /* embedding thumbnail */
            const X_POSITION = X_OFFSET + (CARD_W + CARDS_X_DISTANCE) * c + THUMBNAIL_X_OFFSET;
            const Y_POSITION = Y_OFFSET + (CARD_H + CARDS_Y_DISTANCE) * r + THUMBNAIL_Y_OFFSET;
            let thumbnail;
            try {
                if (vote.voted.pic === '#') {
                    thumbnail = await Jimp.read(BLANK_THUMBNAIL);
                } else {
                    thumbnail = await Jimp.read(vote.voted.pic);
                }
                if (thumbnail) await thumbnail.scaleToFit(THUMBNAIL_W, THUMBNAIL_H, Jimp.HORIZONTAL_ALIGN_CENTER)
                await pic.composite(thumbnail, X_POSITION, Y_POSITION);
            } catch (e) {
                console.error(e, vote.voted);
            }

            /* embedding text */
            const TEXT_X_OFFSET = 6;
            const TEXT_TOP_PADDING = 5;
            const CARD_TEXT_PROPORTION = 5;
            const THUMBNAIL_RENDERED_WIDTH = ((vote.voted.pic !== '#' && thumbnail)
                ? thumbnail.bitmap.width : THUMBNAIL_W);
            const TEXT_X_POSITION = THUMBNAIL_RENDERED_WIDTH + X_POSITION + TEXT_X_OFFSET;

            const MAX_CARD_TEXT_WIDTH = CARD_W - TEXT_X_OFFSET * 2 - THUMBNAIL_RENDERED_WIDTH - THUMBNAIL_X_OFFSET;

            //category
            await pic.print(fontCategory, TEXT_X_POSITION, Y_POSITION + TEXT_TOP_PADDING, {
                text: sanitizeEmbeddedText(vote.category),
                alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
                alignmentY: Jimp.VERTICAL_ALIGN_TOP
            }, MAX_CARD_TEXT_WIDTH, (CARD_H / CARD_TEXT_PROPORTION) - TEXT_TOP_PADDING)

            //name
            await pic.print(fontName, TEXT_X_POSITION, Y_POSITION + TEXT_TOP_PADDING + CARD_H / CARD_TEXT_PROPORTION, {
                text: sanitizeEmbeddedText(vote.voted.name),
                alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
                alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
            }, MAX_CARD_TEXT_WIDTH, (3 * CARD_H / CARD_TEXT_PROPORTION) - 2 * CARD_TEXT_PROPORTION)

            //related movie
            if (vote.voted.name !== vote.voted.movie)
                await pic.print(fontDesc, TEXT_X_POSITION, Y_POSITION + 4 * CARD_H / CARD_TEXT_PROPORTION + TEXT_TOP_PADDING, {
                    text: sanitizeEmbeddedText(vote.voted.movie),
                    alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
                    alignmentY: Jimp.VERTICAL_ALIGN_BOTTOM
                }, MAX_CARD_TEXT_WIDTH, (CARD_H / CARD_TEXT_PROPORTION) - 3 * TEXT_TOP_PADDING)
        }

        /* embedding render title */
        let sample = data.find(e => e);
        const renderTitle = `${sanitizePossessive(username)} ${getOrdinal(sample.awardEvent.edition)} ${sample.awardEvent.name} predictions`;
        await pic.print(fontTitle, X_OFFSET, 0,
            {
                text: sanitizeEmbeddedText(renderTitle),
                alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
                alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
            }, pic.bitmap.width - X_OFFSET * 2, Y_OFFSET
        );

        /* exporting picture */
        const dateToken = Date.now()
        const filename = `${appRoot}/assets/rendered_pictures/${username}_${dateToken}.jpg`;
        await pic.writeAsync(filename)
        return filename;

    } catch (err) {
        console.error(err);
        return false;
    }

}


function getOrdinal(edition) {
    const lastDigit = edition.toString().substr(-1, 1);
    switch (lastDigit) {
        case '1':
            return `${edition}st`;
        case '2':
            return `${edition}nd`;
        case '3':
            return `${edition}rd`;
        default:
            return `${edition}th`;
    }
}

function sanitizeEmbeddedText(text) {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

const sanitizePossessive = function (name) {
    return `${name}\'${name.substr(-1, 1) === 's' ? '' : 's'}`;
}

