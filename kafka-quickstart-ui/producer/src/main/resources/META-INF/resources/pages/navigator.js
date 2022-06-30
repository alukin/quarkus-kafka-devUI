import MessagesPage from "./messagesPage.js";
import TopicsPage from "./topicsPage.js";
import PartitionsPage from "./partitionsPage.js";
import SchemaPage from "./schemaPage.js";
import ConsumerGroupPage from "./consumerGroupPage.js";
import AccessControlListPage from "./accessControlListPage.js";
import NodesPage from "./nodesPage.js";

export const pages = {
    TOPICS: "topics-page",
    PARTITIONS: "partitions-page",
    SCHEMA: "schema-page",
    CONSUMER_GROUPS: "consumer-groups-page",
    ACCESS_CONTROL_LIST: "access-control-list-page",
    NODES: "nodes-page",
    TOPIC_MESSAGES: "topic-messages-page",
    DEFAULT: "topics-page"
}

export default class Navigator {
    constructor() {
        this.registerNavbar();
    }

    allPages = {
        [pages.TOPICS]: {
            header: "Topics",
            showInNavbar: true,
            instance: new TopicsPage(this, pages.TOPICS)
        },
        [pages.PARTITIONS]: {
            header: "Partitions",
            showInNavbar: true,
            instance: new PartitionsPage(pages.PARTITIONS)
        },
        [pages.SCHEMA]: {
            header: "Schema registry",
            showInNavbar: true,
            instance: new SchemaPage(pages.SCHEMA)
        },
        [pages.CONSUMER_GROUPS]: {
            header: "Consumer groups",
            showInNavbar: true,
            instance: new ConsumerGroupPage(pages.CONSUMER_GROUPS)
        },
        [pages.ACCESS_CONTROL_LIST]: {
            header: "Access control list",
            showInNavbar: true,
            instance: new AccessControlListPage(pages.ACCESS_CONTROL_LIST)
        },
        [pages.NODES]: {
            header: "Nodes",
            showInNavbar: true,
            instance: new NodesPage(pages.NODES)
        },
        [pages.TOPIC_MESSAGES]: {
            header: "Messages",
            showInNavbar: false,
            instance: new MessagesPage(pages.TOPIC_MESSAGES),
            parent: pages.TOPICS
        }
    };

    registerNavbar() {
        const keys = Object.keys(this.allPages);
        const navbar = $("#navbar-list");
        navbar.empty();

        const header = $("<h3/>", {
            text: "Kafka dev UI"
        })
            .addClass("top-margin")
        navbar.append(header);
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const value = this.allPages[key];
            if (!value.showInNavbar) continue;
            const navItem = $("<li/>")
                .addClass("nav-item");

            const navLink = $("<a/>", {
                text: value.header,
                href: "#"
            })
                .addClass("nav-link")
                .addClass("active")
                .addClass("link")
                .click(() => this.navigateTo(key));
            navItem.append(navLink);
            navbar.append(navItem);
        }
    }

    navigateTo(requestedPage, params) {
        const keys = Object.keys(this.allPages);
        for (let i = 0; i < keys.length; i++) {
            const elementName = keys[i];
            const d = $("#" + elementName);
            if (d !== null) {
                if (elementName !== requestedPage) {
                    d.removeClass("shown")
                        .addClass("hidden");
                } else {
                    d.removeClass("hidden")
                        .addClass("shown");
                    this.open(requestedPage, params);
                }
            } else {
                console.error("Can not find page div: ", keys[i]);
            }
        }

        this.navigateBreadcrumb(requestedPage, params);
    }

    navigateToDefaultPage() {
        this.navigateTo(pages.DEFAULT);
    }

    open(pageId, params) {
        const value = this.allPages[pageId];
        value.instance.open(params);
    }

    navigateBreadcrumb(page, params) {
        const breadcrumb = $("#nav-breadcrumb");
        breadcrumb.empty();

        let nextPage = this.allPages[page];
        let pageId = page;

        let i = 0;
        while (nextPage !== undefined) {
            let li;
            // We only need to append possible params to the very first element.
            if (i === 0) {
                li = this.createBreadcrumbItem(nextPage.header, pageId, true, params);
            } else {
                li = this.createBreadcrumbItem(nextPage.header, pageId, false);
            }
            breadcrumb.prepend(li);
            pageId = nextPage.parent;
            nextPage = this.allPages[pageId];
            i++;
        }

        const rootLi = this.createBreadcrumbItem("Kafka dev UI", pages.DEFAULT, params);
        breadcrumb.prepend(rootLi);
    }

    createBreadcrumbItem(text, pageId, isActive, params) {
        let breadcrumbText = text;
        if (params !== undefined && params.length > 0 && (params[0] !== null && params[0] !== undefined)) {
            breadcrumbText = text + " (" + params[0] + ")";
        }
        const a = $("<a/>", {href: "#", text: breadcrumbText})
            .click(() => this.navigateTo(pageId, params));
        if (isActive) {
            a.addClass("active");
        }

        const li = $("<li/>")
            .addClass("breadcrumb-item");
        li.append(a);
        return li;
    }
}