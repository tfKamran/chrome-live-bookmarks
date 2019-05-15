/* global require process chrome window document */

import {
    ItemTypes,
    ColorThemes,
    ItemsLayouts,
    StorageKeys
} from './constants';
import { get, load, set } from './preferences';
import '../styles/styles.less';

const packageDetails = require('../../package.json');

const start = () => {
    // Get reference to DOM elements
    const titleDom = document.querySelector('#title #title-text'),
        bookmarksBarDom = document.querySelector('#bookmarks-bar .items'),
        bookmarksDom = document.querySelector('#all-bookmarks .items'),
        colorThemeSwitcher = document.querySelector('#color-theme'),
        itemsLayoutSwitcher = document.querySelector('#items-layout'),
        togglePreferencesButtonDom = document.querySelector('#toggle-preferences'),
        preferencesDom = document.querySelector('#preferences'),
        preferencesBackdrop = document.querySelector('#preferences .backdrop');

    // Create local variables
    let bookmarkNodes = [],
        urlBookmarks = [],
        bookmarksBarBookmarks = [],
        recentVisitedBookmarks = [],
        recentlyHistoryItems = [];

    // Set the title
    titleDom.innerText = `Chrome Live Bookmarks ${packageDetails.version}${process.env.NODE_ENV === 'development' ? ' [DEBUG]' : ''}`;

    // Load preferences
    get[StorageKeys.COLORTHEME](load[StorageKeys.COLORTHEME]);
    get[StorageKeys.ITEMSLAYOUT](load[StorageKeys.ITEMSLAYOUT]);

    // Attach event to toggle preferences
    togglePreferencesButtonDom.onclick = () => {
        preferencesDom.className += ' visible';
    };
    preferencesBackdrop.onclick = () => {
        preferencesDom.className = preferencesDom.className.replace(' visible', '');
    };

    // Attach event to toggle preferences
    togglePreferencesButtonDom.onclick = () => {
        preferencesDom.className += ' visible';
    };
    preferencesBackdrop.onclick = () => {
        preferencesDom.className = preferencesDom.className.replace(' visible', '');
    };

    // Set listener to color-theme changer
    colorThemeSwitcher.onclick = () => {
        get[StorageKeys.COLORTHEME](
            currentColorTheme => {
                const projectedColorTheme = currentColorTheme === ColorThemes.LIGHT
                    ? ColorThemes.DARK
                    : ColorThemes.LIGHT;

                set[StorageKeys.COLORTHEME](projectedColorTheme);
            }
        );
    };

    // Set listener to items-layout changer
    itemsLayoutSwitcher.onclick = () => {
        get[StorageKeys.ITEMSLAYOUT](
            currentItemsLayout => {
                const projectedItemsLayout = currentItemsLayout === ItemsLayouts.LIST
                    ? ItemsLayouts.PILLS
                    : ItemsLayouts.LIST;

                set[StorageKeys.ITEMSLAYOUT](projectedItemsLayout);
            }
        );
    };

    // Read bookmarks
    chrome.bookmarks.getTree(tree => {
        // Get flat bookmarks collection
        bookmarkNodes = flattenTree(tree[0]);

        // Extract all url based bookmarks (exluding folder items)
        urlBookmarks = bookmarkNodes.filter(n => n.url && n.url !== 'chrome://bookmarks/');

        // Extract bookmarks on bookmarks bar
        bookmarksBarBookmarks = urlBookmarks.filter(n => n.parentId === '1');

        // Render bookmarks from bookmarks bar
        renderUrlItems(bookmarksBarDom, bookmarksBarBookmarks, ItemTypes.BOOKMARK);

        // Retrieve recent visits from history
        chrome.history.search(
            {
                text: '',
                maxResults: 100
            },
            items => {
                // Determine recently visited bookmarks
                recentVisitedBookmarks = items
                    .filter(
                        i => urlBookmarks
                            .filter(u => i.url.indexOf(u.url) > -1)
                            .length
                    );

                // Filter non-bookmark history items
                recentlyHistoryItems = items
                    .filter(
                        h => !urlBookmarks
                            .filter(u => u.url === h.url)
                            .length
                    );

                // Populate list with bookmarks and history items
                renderUrlItems(bookmarksDom, recentVisitedBookmarks, ItemTypes.BOOKMARK);
                renderUrlItems(bookmarksDom, recentlyHistoryItems, ItemTypes.HISTORY, true);

                // Apply visual scaling to bookmarks
                applyScalingToBookmarks(bookmarksDom);
            }
        );
    });
};

// Function to flatten bookmark under a node into a collection
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

// Function to render items of a particular type to a supplied Dom element
const renderUrlItems = (domElement, items, type, shouldAppend) => {
    // Quit when the supplied collection is empty
    if (!items.length) {
        return;
    }

    // Create DOM string representing items
    const itemsDomString = items
        .sort((a, b) => {
            if (a.visitCount < b.visitCount) {
                return 1;
            } else if (a.visitCount > b.visitCount) {
                return -1;
            } else {
                return 0;
            }
        })
        .filter(i => i.title && i.url)
        .map(
            b => `<div class="${type === ItemTypes.BOOKMARK ? 'bookmark-item' : 'history-item'}"><a href="${b.url}" title="${b.url}"><span class="title">${b.title}</span><span class="url">&nbsp;[${b.url}]</span></a></div>`
        )
        .join('');

    // Append or assign DOM string to container
    if (shouldAppend) {
        domElement.innerHTML += itemsDomString;
    } else {
        domElement.innerHTML = itemsDomString;
    }
};

// Function to apply scaling to bookmarks
const applyScalingToBookmarks = parentDom => {
    const items = parentDom.querySelectorAll('.bookmark-item'),
        maxScale = 2,
        scaleDelta = (maxScale - 1) / items.length;

    items.forEach((t, i) => {
        t.style.fontSize = (scaleDelta * (items.length - i) + 1) + 'em';
    });
};

// Listen to changes to preferences
chrome.storage.sync.onChanged.addListener(
    values => {
        Object.keys(values)
            .forEach(
                k => {
                    if (load[k]) {
                        load[k](values[k].newValue);
                    }
                }
            );
    }
);

// Start rendering the page
window.addEventListener('load', start);
