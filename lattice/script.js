const canvas = document.getElementById("lattice");
const ctx = canvas.getContext("2d");

//Lattice set up
const lattice = {
    origin: {
        x: canvas.width / 2,
        y: canvas.height / 2
    },

    basis: {
        e1: { x: 100, y: 0 },
        e2: { x: 0, y: -100 }
    }
};

const nodes = new Map();
//if a point is not in this map, then its state is 0, ie empty, ie represented by a plus
//if a point is in this map, its state is 1, ie occupied, ie represented by a square

let draggedNode = null;
let dragPosition = null;
let dragStart = null;

let mousePosition = {
    x: null,
    y: null
};

const proximitySettings = {
    radius: 200,
    plusMinSize: 12,
    plusMaxSize: 20,
    nodeMinSize: 30,
    nodeMaxSize: 50
};

//========================
//LATTICE FUNCTIONS
//===========================
//assigns lattice coordinates to position on the canvas
function latticeToScreen(i, j) {
    return {
        x: lattice.origin.x
            + i * lattice.basis.e1.x
            + j * lattice.basis.e2.x,

        y: lattice.origin.y
            + i * lattice.basis.e1.y
            + j * lattice.basis.e2.y
    };
}

//clicking near a lattice point identifies the coordinates. will be used to add hypermedia to empty lattice points.
function screenToLattice(x, y) {

    const dx =
        (x - lattice.origin.x)
        / lattice.basis.e1.x;

    const dy =
        (y - lattice.origin.y)
        / lattice.basis.e2.y;

    const i = Math.round(dx);
    const j = Math.round(dy);

    if (
        Math.abs(i - dx) < 0.2 &&
        Math.abs(j - dy) < 0.2
    ) {
        return { i, j };
    }

    return null;
}

// Convert lattice coordinates into a Map key.
function key(i, j) {
    return `${i},${j}`;
}

function drawPlus(x, y, size, angle = 0) {

    const half = size / 2;

    ctx.save();

    ctx.translate(x, y);
    ctx.rotate(angle);

    ctx.beginPath();

    ctx.moveTo(-half, 0);
    ctx.lineTo(half, 0);

    ctx.moveTo(0, -half);
    ctx.lineTo(0, half);

    ctx.stroke();

    ctx.restore();
}

function drawLattice() {
    ctx.font = "20px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "gray";

    const range = 4;

    for (let i = -range; i <= range; i++) {

        for (let j = -range; j <= range; j++) {

            // check if point is occupied. if it is, move on to the next point
            const node = nodeAt(i, j);
            if (node) {
                continue;
            }

            const point = latticeToScreen(i, j);

            const p = proximity(point.x, point.y);

            const size =
                proximitySettings.plusMinSize
                    + p * (
                proximitySettings.plusMaxSize
                - proximitySettings.plusMinSize
                );

            ctx.lineWidth = 2;
            ctx.strokeStyle = "gray";

            // Origin is X
            if (i === 0 && j === 0) {
                drawPlus(point.x, point.y, size, Math.PI/4);            
            }

            else {
                drawPlus(point.x, point.y, size);            
            }
        }
    }
}

// ============================================================
// NODE FUNCTIONS
// ============================================================

// Return the node at a lattice point.
// Returns undefined if the point is empty.
function nodeAt(i, j) {
    return nodes.get(key(i, j));
}

function drawNodes() {
    for (const node of nodes.values()) {

        let point;

        // If this is the node being dragged,
        // temporarily draw it at the mouse position.

        if (node === draggedNode) {
            point = dragPosition;
        }

        // Otherwise draw it at its lattice position.

        else {
            point = latticeToScreen(node.i, node.j);
        }

        ctx.fillStyle = "black";

        const p = proximity(point.x, point.y);
        const size = 50 + 25 * p;

        ctx.fillRect(
            point.x - size / 2,
            point.y - size / 2,
            size,
            size
        );
    }
}

function nodeAtScreenPosition(x, y) {
    for (const node of nodes.values()) {

        const point = latticeToScreen(node.i, node.j);

        const distance = Math.sqrt(
            (x - point.x) ** 2 +
            (y - point.y) ** 2
        );

        if (distance < 30) {
            return node;
        }
    }

    return null;
}


//=============================================================
// MOUSE INTERACTIVITY
//=============================================================
function proximity(x, y) {

    if (mousePosition.x === null) {
        return 0;
    }

    const dx = x - mousePosition.x;
    const dy = y - mousePosition.y;

    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > proximitySettings.radius) {
        return 0;
    }

    return 1 - distance / proximitySettings.radius;
}

function nearestLatticePoint(x, y) {

    const dx =
        (x - lattice.origin.x)
        / lattice.basis.e1.x;

    const dy =
        (y - lattice.origin.y)
        / lattice.basis.e2.y;

    return {
        i: Math.round(dx),
        j: Math.round(dy)
    };
}

canvas.addEventListener("mousedown", function(event) {

    const rect = canvas.getBoundingClientRect();

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const node = nodeAtScreenPosition(x, y);

    if (node === null) {
        return;
    }

    draggedNode = node;

    dragStart = {
        i: node.i,
        j: node.j
    };

    dragPosition = {
        x: x,
        y: y
    };

    draw();
});

canvas.addEventListener("mousemove", function(event) {

    const rect = canvas.getBoundingClientRect();

    mousePosition.x = event.clientX - rect.left;
    mousePosition.y = event.clientY - rect.top;

    if (draggedNode === null) {
        draw();
        return;
    }

    dragPosition = {
        x: mousePosition.x,
        y: mousePosition.y
    };

    draw();
});


canvas.addEventListener("mouseup", function(event) {

    if (draggedNode === null) {
        return;
    }

    const rect = canvas.getBoundingClientRect();

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const destination = nearestLatticePoint(x, y);

    const destinationNode =
        nodeAt(destination.i, destination.j);


    // If another node already occupies
    // the destination, don't move.

    if (
        destinationNode !== undefined &&
        destinationNode !== draggedNode
    ) {

        draggedNode = null;
        dragPosition = null;
        dragStart = null;

        draw();

        return;
    }


    // Remove the node from its old Map location.

    nodes.delete(
        key(dragStart.i, dragStart.j)
    );


    // Change its lattice coordinates.

    draggedNode.i = destination.i;
    draggedNode.j = destination.j;


    // Put it into the Map at its new location.

    nodes.set(
        key(destination.i, destination.j),
        draggedNode
    );


    // Finish dragging.

    draggedNode = null;
    dragPosition = null;
    dragStart = null;


    draw();
});


// ============================================================
// CLICK EVENTS
// ============================================================

canvas.addEventListener("click", function(event) {

    const rect = canvas.getBoundingClientRect();

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const point = screenToLattice(x, y);


    // Click wasn't close enough to a lattice point.

    if (point === null) {
        return;
    }


    // Check whether this lattice point is already occupied.

    if (nodeAt(point.i, point.j)) {
        return;
    }


    // Create a new node at this lattice point.

    const node = {
        i: point.i,
        j: point.j,

        type: ".txt",

        text: "New node"
    };


    // Change the lattice point from state 0 → state 1.

    nodes.set(
        key(point.i, point.j),
        node
    );


    // Redraw.

    draw();
});


// ============================================================
// WINDOW RESIZE AND DRAW
// ============================================================
function draw() {

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    drawLattice();
    drawNodes();
}

function resizeCanvas() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    lattice.origin.x = canvas.width / 2;
    lattice.origin.y = canvas.height / 2;

    draw();
}

window.addEventListener(
    "resize",
    resizeCanvas
);

resizeCanvas();