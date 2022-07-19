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

export function createTableHead(title){
    return $("<th/>")
        .attr("scope", "col")
        .text(title);
}