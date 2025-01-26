async function waitForElementClick(element: HTMLElement) {
    return new Promise<void>((resolve, reject) => {
        const clickHandler = () => { element.removeEventListener("click", clickHandler); resolve(); };
        element.addEventListener("click", clickHandler);
    });
}

export async function doTutorial() {
    alert("Welcome to the Rug Pull Simulator. The goal of this game is to create market bubbles for fun and profit." +
    " The profit is measured in Food and is shown on the right side of the screen, on the highlighted element.\n" +
    "\n" +
    "Close this notification, then click anywhere to continue the tutorial.");
    document.getElementById("foodScore")?.classList.add("tutorial-highlight");

    await waitForElementClick(document.body);
    document.getElementById("foodScore")?.classList.remove("tutorial-highlight");

    alert("You make profit by selling bubbles. People don't need bubbles, but if you do enough marketing, they will buy them anyway.\n" +
        "\n" +
        "Click on the highlighted button to brainstorm marketing ideas.");
    const marketingFirstButton = document.getElementById("marketingFirstButton")!;
    marketingFirstButton.classList.add("tutorial-highlight");
    await waitForElementClick(marketingFirstButton);
    marketingFirstButton.classList.remove("tutorial-highlight");

    alert("You have a marketing point. Continue clicking it until you can start a marketing campaign.");
}
