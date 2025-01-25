import { reactive } from "vue";

export function dbg<T>(t: T): T {
  console.log(t);
  return t;
}

export type Vec2 = {
  x: number,
  y: number,
};

export type Econ = {
  pos: Vec2,
  velocity: Vec2,

  food: number;
  bubbles: number;

  bubble_value: number;
};

export function econ(pos: Vec2, velocity: Vec2): Econ {
  return {
    pos,
    velocity,
    food: 0,
    bubbles: 0,
    bubble_value: 0,
  };
}

export type Player = {
  bubbles: number,
  marketing_points: number,
};

export type State = {
  player: Player,
  econs: Econ[],
  billboards: Vec2[],
  food: Vec2[],
  bubbles: Vec2[],
  last_trade: { ammount: number, price: number } | null,
  price_history: number[],
};

export function init(): State {
  return reactive({
    player: {
      bubbles: 2048,
      marketing_points: 0,
    },
    billboards: [],
    food: [],
    bubbles: [],
    last_trade: null,
    price_history: [],
    econs: 
      [...Array(32).keys()].map(() => econ(
      // [...Array(Math.round(Math.random() * 32)).keys()].map(() => econ(
        random_pos(),
        {
          x: Math.random() * 2 - 1,
          y: Math.random() * 2 - 1,
        },
      )),
  });
}

function random_pos(): Vec2 {
  while (true) {
    const pos =  {
      x: Math.random() * 1024 - 512,
      y: Math.random() * 1024 - 512,
    };

    if (length(pos) < 512) return pos;
  }
}

function sub(a: Vec2, b: Vec2): Vec2 {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
  };
}

function length(vec: Vec2): number {
  const x = Math.abs(vec.x);
  const y = Math.abs(vec.y);
  return Math.abs(Math.sqrt(x * x + y * y));
} 

export function tick(state: State) {
  for (const i in state.econs) {
    const econ = state.econs[i];


    if (length(econ.pos) > 512) {
      econ.velocity.x = -econ.velocity.x;
      econ.velocity.y = -econ.velocity.y;
    }

    for (const j in state.econs) {
      if (i === j) continue;

      const other = state.econs[j];

      // if (length(sub(econ.pos, other.pos)) < 64) {
      //   econ.velocity = {x: 0, y: 0};
      // }

      if (i >= j) continue; // below is only once per pair

      if (length(sub(econ.pos, other.pos)) < 32) {
        const tmp = econ.velocity;
        econ.velocity = other.velocity;
        other.velocity = tmp;

        trade(state, econ, other);
      }
    }

    for (const j in state.billboards) {
      const billboard = state.billboards[j];

      if (length(sub(econ.pos, billboard)) < 128) {
        // econ.velocity.x = -econ.velocity.x;
        // econ.velocity.y = -econ.velocity.y;

        econ.bubble_value += 0.1;
      }
    }

    for (const j in state.food) {
      const food = state.food[j];

      if (length(sub(econ.pos, food)) < 64) {
        econ.food += 12;

        state.food.splice(Number(j), 1);

        break;
      }
    }

    for (const j in state.bubbles) {
      const bubble = state.bubbles[j];

      if (length(sub(econ.pos, bubble)) < 32) {
        econ.bubbles += 1;

        state.bubbles.splice(Number(j), 1);

        break;
      }
    }

    econ.pos.x += econ.velocity.x;
    econ.pos.y += econ.velocity.y;

    if (Math.random() < 0.01) {
      econ.velocity = {
        x: Math.random() * 2 - 1,
        y: Math.random() * 2 - 1,
      };
    }
  }

  if (Math.random() < 0.005) {
    state.food.push(random_pos());
  }
}

function trade(state: State, a: Econ, b: Econ) {
  // when does a trade happen?
  // i guess when one has too many and one has too little
  // the idea for now is to also use the value as the ammount the econ wants.
  // at that point an exchange rate needs to be determined.
  // sale only happens if the seller has a lower value than the buyer.
  // at that point we use the price of the seller.

  let seller;
  let buyer;

  if (a.bubbles > a.bubble_value && b.bubbles < b.bubble_value) {
    seller = a;
    buyer = b;
  } else if (b.bubbles > b.bubble_value && a.bubbles < a.bubble_value) {
    seller = b;
    buyer = a;
  } else {
    return;
  }

  if (buyer.food === 0) return;

  const price = seller.bubble_value;

  if (price > buyer.bubble_value) return;

  const ammount = Math.min(
    Math.ceil(buyer.bubble_value) - buyer.bubbles,
    Math.floor(buyer.food / price),
  );

  if (ammount === 0) {
    return;
  }

  seller.bubbles -= ammount;
  buyer.bubbles += ammount;

  buyer.food -= ammount * price;
  seller.food += ammount * price;

  state.last_trade = {
    ammount,
    price,
  };
  state.price_history.push(price);
}

export function availableMarketingDevices(player: Player) {
  return {
    billboard: player.marketing_points >= 20,
    influencer: player.marketing_points >= 50,
  };
}
