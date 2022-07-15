export function toggleSpinner(containerId, spinnerContainerId) {
    const spinnerId = spinnerContainerId === undefined ? "#page-load-spinner" : "#" + spinnerContainerId;
    const pageId = "#" + containerId;
    let first;
    let second;

    if ($(spinnerId).hasClass("shown")) {
        first = pageId;
        second = spinnerId;
    } else {
        second = pageId;
        first = spinnerId;
    }

    $(first)
        .removeClass("hidden")
        .addClass("shown");
    $(second)
        .addClass("hidden")
        .removeClass("shown");
}