const clientID = '3SoE-TTRJ783ZW5_pY_gEnmf1nohc3N5I2jUuPqsHM8';

function domReady(fn) {
    if (document.readyState !== 'loading') {
        fn();
    } else {
        document.addEventListener('DOMContentLoaded', (event) => {
            fn();
        });
    }
}

const state = {
    query: 'Dog',
    images: [],
    offset: 0,
    quantity: 10,
    maxImages: 55,
    controllers: {
        nav: null,
        results: null,
        search: null,
        fetch: null,
        modal: null
    }
};

class ModalController {

    constructor() {
        this.modalEle = document.querySelector('#modal');
        this.bigBox = document.querySelector("#modal img.big");
        this.attachEvents();
    }

    showModal() {
        this.modalEle.classList.remove('hide');
        document.body.classList.add('prevent-scroll');
    }

    hideModal() {
        this.modalEle.classList.add('hide');
        document.body.classList.remove('prevent-scroll');

    }

    showImage(url) {
        this.bigBox.src = url;
        this.showModal();
    }

    attachEvents() {
        this.modalEle.addEventListener('click', this.clickHandler.bind(this));
    }

    clickHandler(event) {
        if (event.target !== event.currentTarget) {
            return;
        }
        this.hideModal();
    }
}

class SearchController {
    constructor() {
        this.input = document.querySelector('#search');
        this.attachEvents();
        this.lastInputTime = null;
        this.debounced = this.debounce(this.inputHandler)
    }

    attachEvents() {
        this.input.addEventListener('keydown', this.inputeHanlderWrapper.bind(this));
    }

    async inputHandler(event) {
        state.query = event.target.value;
        await state.controllers.fetch.fetchImages();
        state.controllers.results.renderImages();
        state.controllers.nav.update();
    }

    inputeHanlderWrapper(event) {
        this.debounced(event);
    }

    debounce(fn, duration = 1200) {
        let t;
        return function (event) {
            clearTimeout(t);
            t = setTimeout(fn.bind(this, event), duration);
        }
    }
}

class FetchController {
    async fetchImages() {
        let results;
        let page = 0;
        let totalPages = 1;
        let response;
        let parsed;
        state.images = [];
        state.offset = 0;

        async function fetchNow() {
            // console.log(page, totalPages, state.maxImages, state.images.length);
            try {
                page++;
                response = await fetch(`https://api.unsplash.com/search/photos?page=${page}&query=${state.query}&client_id=${clientID}`);
                results = await response.json();
                parsed = results.results || [];

                parsed = parsed.map(result => {
                    return {
                        fullUrl: result.urls.full,
                        thumbnail: result.urls.regular
                    };
                });

                state.images = [...state.images, ...parsed];
                totalPages = results.total_pages;
            } catch (error) {
                alert('error fetching images');
                console.log(error);
            }

            if (state.images.length < state.maxImages && page < totalPages) {
                await fetchNow();
            }

        }

        await fetchNow();

        if (state.images.length > state.maxImages) {
            state.images.splice(state.maxImages, state.images.length - state.maxImages);
        }

    }
}

class NavController {
    constructor() {
        this.leftEle = document.querySelector('.navigation .left');
        this.rightEle = document.querySelector('.navigation .right');
        this.attachEvents();
        this.update();
    }

    attachEvents() {
        this.leftEle.addEventListener('click', this.leftClickHandler.bind(this), false);
        this.rightEle.addEventListener('click', this.rightClickHandler.bind(this), false);
    }

    leftClickHandler() {
        state.offset -= state.quantity;
        if (state.offset < 0) {
            state.offset = 0;
            return;
        }
        this.update();
        state.controllers.results.renderImages();
    }

    rightClickHandler() {
        if ((state.offset + state.quantity) < state.images.length) {
            state.offset += state.quantity;
        } else {
            return;
        }
        this.update();
        state.controllers.results.renderImages();
    }

    update() {
        if (state.offset === 0) {
            this.leftEle.classList.add('disabled');
        } else {
            this.leftEle.classList.remove('disabled');
        }

        if (state.offset + state.quantity >= state.images.length) {
            this.rightEle.classList.add('disabled');
        } else {
            this.rightEle.classList.remove('disabled');
        }
    }



}

class ResultsView {
    constructor() {
        this.resultsEle = document.querySelector('#results');
        this.imagesContEle = document.querySelector('#results .images');
        this.totalEle = document.querySelector('#results .info .total');
        this.currentEle = document.querySelector('#results .info .current');
        this.attachGrayEffect();
    }

    createImageEle(url) {
        const ele = document.createElement('div');
        ele.classList.add('img');
        ele.style.background = '';
        ele.style.backgroundImage = `url(${url})`;
        return ele;
    }

    renderImages() {
        let fragment = document.createDocumentFragment();
        for (let i = 0; i < state.quantity && i < (state.images.length - state.offset); i++) {
            const ele = this.createImageEle(state.images[state.offset + i].thumbnail);

            ele.addEventListener('click', function (event) {
                state.controllers.modal.showImage(state.images[state.offset + i].fullUrl);
            });

            fragment.appendChild(ele);
        }

        this.imagesContEle.innerHTML = '';
        this.imagesContEle.appendChild(fragment);
        this.updateInfo();
    }

    attachGrayEffect() {
        const imagesEle = document.querySelector('#results .images');

        imagesEle.addEventListener('mouseover', function (event) {
            if (event.target.matches('#results .img')) {
                if (imagesEle.classList.contains('grayout') === false) {
                    imagesEle.classList.add('grayout');
                }
            }
        }, false);

        imagesEle.addEventListener('mouseout', function (event) {
            if (event.target.matches('#results .img')) {
                imagesEle.classList.remove('grayout');
            }
        }, false);
    }

    updateInfo() {
        this.currentEle.innerText = Math.min(state.images.length, state.offset + state.quantity);
        this.totalEle.innerText = state.images.length;
    }
}

domReady(async function () {
    const fetchCtrl = new FetchController();
    const resultsCtrl = new ResultsView();
    const navCtrl = new NavController();
    const searchCtrl = new SearchController();
    const modalCtrl = new ModalController();

    state.controllers.nav = navCtrl;
    state.controllers.results = resultsCtrl;
    state.controllers.fetch = fetchCtrl;
    state.controllers.search = searchCtrl;
    state.controllers.modal = modalCtrl;

    await fetchCtrl.fetchImages();
    await resultsCtrl.renderImages();
    state.controllers.nav.update();
});
