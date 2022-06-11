// Horizontal overlap functions
import defineFunction from "../defineFunction"
import mathMLTree from "../mathMLTree"
import * as mml from "../buildMathML"
import ParseError from "../ParseError";

const textModeLap = ["\\clap", "\\llap", "\\rlap"]

defineFunction({
  type: "lap",
  names: ["\\mathllap", "\\mathrlap", "\\mathclap", "\\clap", "\\llap", "\\rlap"],
  props: {
    numArgs: 1,
    allowedInText: true
  },
  handler: ({ parser, funcName, token }, args) => {
    if (textModeLap.includes(funcName)) {
      if (parser.settings.strict && parser.mode !== "text") {
        throw new ParseError(`{${funcName}} can be used only in text mode.
 Try \\math${funcName.slice(1)}`, token)
      }
      funcName = funcName.slice(1)
    } else {
      funcName = funcName.slice(5)
    }
    const body = args[0]
    return {
      type: "lap",
      mode: parser.mode,
      alignment: funcName,
      body
    }
  },
  mathmlBuilder: (group, style) => {
    // mathllap, mathrlap, mathclap
    const node = new mathMLTree.MathNode("mpadded", [mml.buildGroup(group.body, style)])

    if (group.alignment === "rlap") {
      if (group.body.body.length > 0 && group.body.body[0].type === "genfrac") {
        // In Firefox, a <mpadded> squashes the 3/18em padding of a child \frac. Put it back.
        node.setAttribute("lspace", "0.16667em")
      }
    } else {
      const offset = group.alignment === "llap" ? "-1" : "-0.5"
      node.setAttribute("lspace", offset + "width")
    }
    node.setAttribute("width", "0px")
    return node
  }
})