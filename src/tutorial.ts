import { watch, type Ref } from "vue";
import type { State } from "./state";
import type { Vec2 } from "./vector-algebra";

async function waitForElementClick(element: HTMLElement) {
    return new Promise<void>((resolve, reject) => {
        const clickHandler = () => { element.removeEventListener("click", clickHandler); resolve(); };
        element.addEventListener("click", clickHandler);
    });
}

export async function doTutorial(
    pauseButton: Ref<boolean>,
    state: Ref<State>,
    tutorialHighlight: Ref<Vec2|null>,
    placing: Ref<"bubbles" | "billboardFirstLeg" | "billboardSecondLeg" | null>,
) {
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
    const billboardButton = document.getElementById("marketingBillboardButton")!;
    billboardButton.classList.add("tutorial-highlight");
    await waitForElementClick(billboardButton);
    billboardButton.classList.remove("tutorial-highlight");

    pauseButton.value = true;
    const econWithMaxFood = state.value.econs.reduce((e1, e2) => e2.food > e1.food ? e2 : e1);
    econWithMaxFood.velocity = { x: 0.01, y: 0.01 };

    tutorialHighlight.value = econWithMaxFood.pos;

    alert("You can now place a marketing billboard. We advise you to place it near this person.\n" +
        "\n" +
        "This is the richest person on the board and they can afford a lot of bubbles.\n" +
        "Wealth increases by collecting food (the yellow dots on the map). It decreases over time, as people need to eat.\n" +
        "A person's wealth is indicated by the red pie chart. Very poor people are almost completely red and might die soon."
    )
    for(let i of ['billboardFirstLeg', 'billboardSecondLeg']) {
        await new Promise<void>((resolve, reject) => {
            watch(placing, (_oldV, newV) => {
                if(newV == i) resolve();
                else reject(`waited for ${i}, received ${newV}`);
            }, { once: true });
        });
    }

    tutorialHighlight.value = null;
    pauseButton.value = false;
    alert("You've placed a billboard! The hype for bubbles is rising.\n" +
        "Now distribute some bubbles near your billboard and watch as people eagerly buy them."
    );
    const placeBubblesButton = document.getElementById("placeBubblesButton")!;
    placeBubblesButton.classList.add("tutorial-highlight");
    await waitForElementClick(placeBubblesButton.parentElement!); // also fine if the user clicks on another bubble button
    placeBubblesButton.classList.remove("tutorial-highlight");

    await new Promise<void>((resolve, reject) => {
        watch(() => { state.value.player.food }, resolve);
    });

    alert(
        "This is how the game works. Try to make as much money as possible - your " + state.value.player.food + "$ are a good start!\n" +
        "Here are other things you can do:\n" +
        "  - Improve the bubble price by improving marketing.\n" +
        "  - Place bubbles to make profit. However, more bubbles in the markets will drive the price down.\n" +
        "  - If your marketers are costing more than they are worth, you can cash out (on the top) and finish the game with all your current money."
    );
}
