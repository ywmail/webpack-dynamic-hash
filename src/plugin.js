const {
  PLUGIN_NAME,
  REPLACE_SRC_OPTION_NAME,
  SUPPRESS_ERRORS_OPTION_NAME
} = require("./constants");
const {
  getOrSetHookMethod
} = require("./helpers");
const {
  buildSrcReplaceCode,
  buildMethodCode,
  buildStringCode,
  buildVariableCode
} = require("./codeBuilders");

class WebpackDynamicHash {
  constructor(userOptions) {

    // temp fix to support typo in option name
    if (userOptions && typeof userOptions.supressErrors !== 'undefined') {
      userOptions[SUPPRESS_ERRORS_OPTION_NAME] = userOptions.supressErrors;
    }

    this.options = Object.assign({},
      WebpackDynamicHash.defaultOptions,
      userOptions
    );

    // `path`, `methodName` and `variableName` are mutualy exclusive and cannot be used together
    let exclusiveOptionLength = [this.options.methodName, this.options.path, this.options.variableName].filter(_ => _).length;
    if (exclusiveOptionLength && exclusiveOptionLength !== 1) {
      throw new Error(
        `${PLUGIN_NAME}: Specify either "methodName", "path" or "variableName", not two or more. See https://github.com/ywmail/webpack-dynamic-hash#configuration`
      );
    }
  }

  apply(compiler) {
    getOrSetHookMethod(compiler, 'compiler')(this.compilerHook.bind(this));
    if (this.options.variableName || this.options.methodName) {
      compiler.hooks.compilation.tap(
        PLUGIN_NAME,
        (compilation, {
          normalModuleFactory
        }) => {
          const mainTemplate = compilation.mainTemplate;
          mainTemplate.hooks.currentHash.tap(
            PLUGIN_NAME,
            (_, length) => {
              if (this.options.methodName) {
                return `${this.options.methodName}()`;
              } else if (this.options.variableName) {
                return `${this.options.variableName}`;
              }
            }
          );

        }
      );
    }

  }

  compilationHook({
    mainTemplate
  }) {
    this.activateReplacePublicPath(mainTemplate);

    if (this.options[REPLACE_SRC_OPTION_NAME]) {
      this.activateReplaceSrc(mainTemplate);
    }
  }

  compilerHook({
    mainTemplate
  }) {
    mainTemplate.hooks.currentHash.tap(
      PLUGIN_NAME,
      (_, length) => {
        if (this.options.methodName) {
          return `${this.options.methodName}()`;
        } else if (this.options.variableName) {
          return `${this.options.variableName}`;
        }
      }
    );

  }

  activateReplaceSrc(mainTemplate) {
    getOrSetHookMethod(mainTemplate, "jsonp-script")(source => [
      source,
      `script.src = (${buildSrcReplaceCode(
        this.options[REPLACE_SRC_OPTION_NAME],
        this.options[SUPPRESS_ERRORS_OPTION_NAME]
      )})(script.src);`
    ].join("\n"));
  }

  activateReplacePublicPath(mainTemplate) {
    getOrSetHookMethod(mainTemplate, "require-extensions")((source, chunk, hash) => {
      const defaultPublicPath = mainTemplate.getPublicPath({
        hash
      });

      const _config = Object.assign({
        path: defaultPublicPath
      }, this.options);

      let getterBody;
      if (_config.variableName) {
        getterBody = buildVariableCode(_config.variableName, defaultPublicPath, this.options[SUPPRESS_ERRORS_OPTION_NAME]);
      } else if (_config.methodName) {
        getterBody = buildMethodCode(_config.methodName, defaultPublicPath, this.options[SUPPRESS_ERRORS_OPTION_NAME]);
      } else if (_config.path) {
        getterBody = buildStringCode(_config.path);
      }

      return [
        source,
        `// ${PLUGIN_NAME}`,
        "Object.defineProperty(" + mainTemplate.requireFn + ', "h", {',
        "  get: function () {",
        getterBody,
        " }",
        "})"
      ].join("\n");
    });
  }
}

WebpackDynamicHash.prototype.defaultOptions = {};

module.exports = WebpackDynamicHash;