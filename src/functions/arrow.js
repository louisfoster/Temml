import defineFunction from "../defineFunction";
import mathMLTree from "../mathMLTree";
import stretchy from "../stretchy";
import { emScale } from "../units";
import * as mml from "../buildMathML";

// Helper functions
const paddedNode = (group, width, lspace = "0.3em") => {
  const node = new mathMLTree.MathNode("mpadded", group ? [group] : []);
  node.setAttribute("width", width)
  node.setAttribute("lspace", lspace)
  return node;
};

const labelSize = (size, scriptLevel) =>  (size / emScale(scriptLevel)).toFixed(4) + "em"

const munderoverNode = (name, body, below, style) => {
  const arrowNode = stretchy.mathMLnode(name);
  // Is this the short part of a mhchem equilibrium arrow?
  const isEq = name.slice(1, 3) === "eq"
  const minWidth = name.charAt(1) === "x"
    ? "1.75"  // mathtools extensible arrows are 1.75em long
    : name.slice(2, 4) === "cd"
    ? "3.0"  // cd package arrows
    : isEq
    ? "1.0"  // The shorter harpoon of a mhchem equilibrium arrow
    : "2.0"; // other mhchem arrows
  arrowNode.setAttribute("minsize", String(minWidth) + "em");
  arrowNode.setAttribute("lspace", "0")
  arrowNode.setAttribute("rspace", (isEq ? "0.5em" : "0"))

  // <munderover> upper and lower labels are set to scriptlevel by MathML
  // So we have to adjust our dimensions accordingly.
  const labelStyle = style.withLevel(style.level < 2 ? 2 : 3)
  const emptyLabelWidth = labelSize(minWidth, labelStyle.level)
  const lspace = labelSize((isEq ? 0 : 0.3), labelStyle.level)
  let widthAdder = labelSize((isEq ? -0.4 : 0.6), labelStyle.level)
  if (widthAdder.charAt(0) !== "-") { widthAdder = "+" + widthAdder }

  const upperNode = (body && body.body &&
    // \hphantom        visible content
    (body.body.body || body.body.length > 0))
    ? paddedNode(mml.buildGroup(body, labelStyle), widthAdder, lspace)
      // Since Firefox does not recognize minsize set on the arrow,
      // create an upper node w/correct width.
    : paddedNode(null, emptyLabelWidth, "0")
  const lowerNode = (below && below.body &&
    (below.body.body || below.body.length > 0))
    ? paddedNode(mml.buildGroup(below, labelStyle), widthAdder, lspace)
    : paddedNode(null, emptyLabelWidth, "0")
  const node = new mathMLTree.MathNode("munderover", [arrowNode, lowerNode, upperNode]);
  return node
}

// Stretchy arrows with an optional argument
defineFunction({
  type: "xArrow",
  names: [
    "\\xleftarrow",
    "\\xrightarrow",
    "\\xLeftarrow",
    "\\xRightarrow",
    "\\xleftrightarrow",
    "\\xLeftrightarrow",
    "\\xhookleftarrow",
    "\\xhookrightarrow",
    "\\xmapsto",
    "\\xrightharpoondown",
    "\\xrightharpoonup",
    "\\xleftharpoondown",
    "\\xleftharpoonup",
    "\\xlongequal",
    "\\xtwoheadrightarrow",
    "\\xtwoheadleftarrow",
    // The next 7 functions are here only to support mhchem
    "\\yields",
    "\\yieldsLeft",
    "\\mesomerism",
    "\\longrightharpoonup",
    "\\longleftharpoondown",
    // The next 3 functions are here only to support the {CD} environment.
    "\\\\cdrightarrow",
    "\\\\cdleftarrow",
    "\\\\cdlongequal"
  ],
  props: {
    numArgs: 1,
    numOptionalArgs: 1
  },
  handler({ parser, funcName }, args, optArgs) {
    return {
      type: "xArrow",
      mode: parser.mode,
      name: funcName,
      body: args[0],
      below: optArgs[0]
    };
  },
  mathmlBuilder(group, style) {
    // Build the arrow and its labels.
    const node = munderoverNode(group.name, group.body, group.below, style)
    // Create operator spacing for a relation.
    const wrapper  = new mathMLTree.MathNode("mpadded", [node])
    wrapper.setAttribute("lspace", "0.2778em")
    wrapper.setAttribute("width", "+0.5556em")
    return wrapper
  }
});

const arrowComponent = {
  "\\xtofrom": ["\\xrightarrow", "\\xleftarrow"],
  "\\xleftrightharpoons": ["\\xleftharpoonup", "\\xrightharpoondown"],
  "\\xrightleftharpoons": ["\\xrightharpoonup", "\\xleftharpoondown"],
  "\\yieldsLeftRight": ["\\yields", "\\yieldsLeft"],
  // The next three all get the same harpoon glyphs. Only the lengths and paddings differ.
  "\\equilibrium": ["\\longrightharpoonup", "\\longleftharpoondown"],
  "\\equilibriumRight": ["\\longrightharpoonup", "\\eqleftharpoondown"],
  "\\equilibriumLeft": ["\\eqrightharpoonup", "\\longleftharpoondown"]
}

// Browsers are not good at stretching a glyph that contains a pair of stacked arrows such as ⇄.
// So we stack a pair of single arrows.
defineFunction({
  type: "stackedArrow",
  names: [
    "\\xtofrom",              // expfeil
    "\\xleftrightharpoons",   // mathtools
    "\\xrightleftharpoons",   // mathtools
    "\\yieldsLeftRight",      // mhchem
    "\\equilibrium",           // mhchem
    "\\equilibriumRight",
    "\\equilibriumLeft"
  ],
  props: {
    numArgs: 1,
    numOptionalArgs: 1
  },
  handler({ parser, funcName }, args, optArgs) {
    const lowerArrowBody = args[0]
      ? {
        type: "hphantom",
        mode: parser.mode,
        body: args[0]
      }
      : null;
    const upperArrowBelow = optArgs[0]
      ? {
        type: "hphantom",
        mode: parser.mode,
        body: optArgs[0]
      }
      : null;
    return {
      type: "stackedArrow",
      mode: parser.mode,
      name: funcName,
      body: args[0],
      upperArrowBelow,
      lowerArrowBody,
      below: optArgs[0]
    };
  },
  mathmlBuilder(group, style) {
    const topLabel = arrowComponent[group.name][0]
    const botLabel = arrowComponent[group.name][1]
    const topArrow = munderoverNode(topLabel, group.body, group.upperArrowBelow, style)
    const botArrow = munderoverNode(botLabel, group.lowerArrowBody, group.below, style)
    let wrapper

    const raiseNode = new mathMLTree.MathNode("mpadded", [topArrow])
    raiseNode.setAttribute("voffset", "0.3em")
    raiseNode.setAttribute("height", "+0.3em")
    raiseNode.setAttribute("depth", "-0.3em")
    // One of the arrows is given ~zero width. so the other has the same horzontal alignment.
    if (group.name === "\\equilibriumLeft") {
      const botNode =  new mathMLTree.MathNode("mpadded", [botArrow])
      botNode.setAttribute("width", "0.5em")
      wrapper = new mathMLTree.MathNode("mpadded", [botNode, raiseNode])
    } else {
      raiseNode.setAttribute("width", (group.name === "\\equilibriumRight" ? "0.5em" : "0"))
      wrapper = new mathMLTree.MathNode("mpadded", [raiseNode, botArrow])
    }

    wrapper.setAttribute("voffset", "-0.18em")
    wrapper.setAttribute("width", "+0.5556em")
    wrapper.setAttribute("height", "-0.18em")
    wrapper.setAttribute("depth", "+0.18em")
    wrapper.setAttribute("lspace", "0.2778em")
    return wrapper
  }
});

