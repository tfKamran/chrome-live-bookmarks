/* global require chrome window document */

import '../styles/styles.less';

const packageDetails = require('../../package.json');

const load = function () {
    const titleDom = document.querySelector('#title');
    const bookmarksBarDom = document.querySelector('#bookmarks-bar .items');
    const bookmarksDom = document.querySelector('#all-bookmarks .items');

    let bookmarkNodes = [];
    let urlBookmarks = [];
    let bookmarksBarBookmarks = [];
    let recentVisitedBookmarks = [];

    titleDom.innerText = `Chrome Live Bookmarks ${packageDetails.version}`;

    chrome.bookmarks.getTree(tree => {
        bookmarkNodes = flattenTree(tree[0]);
        urlBookmarks = bookmarkNodes.filter(n => n.url && n.url !== 'chrome://bookmarks/');
        bookmarksBarBookmarks = urlBookmarks.filter(n => n.parentId === '1');

        renderUrlBookmarks(bookmarksBarDom, bookmarksBarBookmarks);

        chrome.history.search(
            {
                text: '',
                maxResults: 50
            },
            items => {
                recentVisitedBookmarks = urlBookmarks
                    .filter(
                        u => items
                            .filter(i => i.url.indexOf(u.url) > -1)
                            .length
                    );

                renderUrlBookmarks(bookmarksDom, recentVisitedBookmarks);
            }
        );
    });
};

const flattenTree = node =>
    [node]
        .concat(
            node.children
                ? node.children.map(
                    n => flattenTree(n)
                ).reduce(
                    (a, c) => a.concat(c),
                    []
                )
                : []
        );

const renderUrlBookmarks = (domElement, bookmarks) => {
    if (!bookmarks.length) {
        return;
    }

    domElement.innerHTML += bookmarks
        .sort((a, b) => {
            if (a.visitCount < b.visitCount) {
                return 1;
            } else if (a.visitCount > b.visitCount) {
                return -1;
            } else {
                return 0;
            }
        })
        .map(
            b => `<div class="bookmark-item"><a href="${b.url}" title="${b.url}">${b.title}</a></div>`
        )
        .join('');
};

window.addEventListener('load', load);
