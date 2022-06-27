import MessagesPage from "./messagesPage.js";
import TopicsPage from "./topicsPage.js";
import PartitionsPage from "./partitionsPage.js";
import SchemaPage from "./schemaPage.js";
import ConsumerGroupPage from "./consumerGroupPage.js";
import AccessControlListPage from "./accessControlListPage.js";
import NodesPage from "./nodesPage.js";

//FIXME
const pages = {
    TOPICS_PAGE: "topics-page",

}

export default class Navigator {
    constructor() {
        this.registerNavbar();
    }

    allPages = {
        "topics-page": {
            header: "Topics",
            showInNavbar: true,
            instance: new TopicsPage(this, "topic-page")
        },
        "partitions-page": {
            header: "Partitions",
            showInNavbar: true,
            instance: new PartitionsPage("partitions-page")
        },
        "schema-page": {
            header: "Schema registry",
            showInNavbar: true,
            instance: new SchemaPage("schema-page")
        },
        "consumer-groups-page": {
            header: "Consumer groups",
            showInNavbar: true,
            instance: new ConsumerGroupPage("consumer-groups-page")
        },
        "access-control-list-page": {
            header: "Access control list",
            showInNavbar: true,
            instance: new AccessControlListPage("access-control-list-page")
        },
        "nodes-page": {
            header: "Nodes",
            showInNavbar: true,
            instance: new NodesPage("nodes-page")
        },
        "topic-messages-page": {
            header: "Topics",
            showInNavbar: false,
            instance: new MessagesPage("topic-messages-page")
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
            const d = document.getElementById(elementName);
            if (d !== null) {
                if (elementName !== requestedPage) {
                    d.style.display = "none";
                } else {
                    d.style.display = "block";
                    this.open(requestedPage, params);
                }
            } else {
                console.error("Can not find page div: ", keys[i]);
            }
        }
    }

    navigateToDefaultPage() {
        this.navigateTo("topics-page");
    }

    open(pageId, params) {
        const value = this.allPages[pageId];
        value.instance.open(params);
    }

    navigateBreadcrumb() {
        //TODO:
    }
}