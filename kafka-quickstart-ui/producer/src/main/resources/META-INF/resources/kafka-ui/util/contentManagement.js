export function createTableItem(text) {
    return $("<td/>", {
        text: text
    });
}

export function createTableItemHtml(html) {
    return $("<td/>").append(html);
}

export function createPrimaryBtn(text, onClick) {
    return $("<button/>", {
        text: text
    })
        .addClass("btn")
        .addClass("btn-primary")
        .addClass("right-margin")
        .click(onClick);
}

export function createTableHead(title) {
    return $("<th/>")
        .attr("scope", "col")
        .text(title);
}

export function createIcon(iconClass) {
    return $("<i/>")
        .addClass("bi")
        .addClass(iconClass);
}

export class CollapseRow {
    constructor(collapseId) {
        this.collapseId = collapseId;
        const chevronIcon = createIcon("bi-chevron-right")
            .addClass("rotate-icon");
        this.arrow = $("<div/>")
            .addClass("d-flex")
            .addClass("justify-content-center")
            .append(chevronIcon);

        Object.getOwnPropertyNames(CollapseRow.prototype).forEach((key) => {
            if (key !== 'constructor') {
                this[key] = this[key].bind(this);
            }
        });
    }

    getCollapseContent(tableWidth, collapseContent) {
        return $("<tr/>").append(createTableItemHtml(
            collapseContent
                .addClass("collapse-content"))
            .attr("colspan", tableWidth))
            .attr("id", this.collapseId)
            .addClass("collapse");
    }

    collapse() {
        $("#" + this.collapseId).toggle();
        if (this.arrow.hasClass("icon-rotated")) {
            this.arrow.removeClass("icon-rotated");
        } else {
            this.arrow.addClass("icon-rotated");
        }
    }
}