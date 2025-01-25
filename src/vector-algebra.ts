export type Vec2 = {
  x: number,
  y: number,
};

export function sub(a: Vec2, b: Vec2): Vec2 {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
  };
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function minus(a: Vec2): Vec2 {
  return {x: -a.x, y:-a.y};
}

export function scale(a: Vec2, l: number): Vec2 {
  return {x: l * a.x, y: l * a.y};
}

export function normalize(a: Vec2): Vec2 {
  return scale(a, 1/length(a));
}

export function length(vec: Vec2): number {
  const x = Math.abs(vec.x);
  const y = Math.abs(vec.y);
  return Math.abs(Math.sqrt(x * x + y * y));
} 

function dist(a: Vec2, b: Vec2) {
  return length(sub(a, b));
}

export function scalarProduct(v1: Vec2, v2: Vec2): number {
  return v1.x * v2.x + v1.y * v2.y;
}

export function rebound(v: Vec2, n: Vec2): Vec2 {
  if (scalarProduct(v, n) > 0) {
    return v; // the object was going away from the normal vector anyway
  }

  const n_vec = [ n.x / length(n), n.y / length(n) ];
  const p_vec = [ n_vec[1], -n_vec[0] ];
  const v_vec = [ v.x, v.y ];
  const matrix = [[undefined, undefined], [undefined, undefined]];
  for(let i=0; i<2; i++){
    for(let j=0; j<2; j++){
      matrix[i][j] = p_vec[i]*p_vec[j] - n_vec[i]*n_vec[j];
    }
  }

  // Matrix-vector multiplication
  let result = [0, 0];
  for(let i=0; i<2; i++){
    for(let j=0; j<2; j++){
      result[i] += matrix[i][j] * v_vec[j];
    }
  }
  return { x: result[0], y: result[1] };
}
