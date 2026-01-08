import { print } from "./server.js";
import { moveToBack } from "../helpers/moveToBack.js";
import Table from "../helpers/Table.js";

type CommandAction = (...params: any[]) => any;
type OnCommandSuccess = (...returnValue: any[]) => void;
type OnCommandFailure = (err: any) => void;
type AllowedParamTypes = "string" | "number" | "boolean" | "rest[string]" | "rest[number]" | "rest[boolean]";

interface ICommand {
    Action: CommandAction;
    OnSuccess?: OnCommandSuccess;
    OnFailure?: OnCommandFailure;
    Description?: string;
    Params?: CommandParams;
}

interface CommandParams {
    [ParamName: string]: {
        Value?: string | number | boolean;
        Alias?: string;
        Description?: string;
        Type: AllowedParamTypes;
    };
}

export class command {
    public readonly Name: string;
    public readonly Parameters?: CommandParams;
    public readonly Description?: string;
    public readonly Action: CommandAction;
    public readonly OnSuccess?: OnCommandSuccess;
    public readonly OnFailure?: OnCommandFailure;

    public static readonly CommandList: { [CommandName: string]: command } = {};

    /**
     * Create a new shell-like command.  
     * 
     * Rules:  
     * - The rest parameter in a command cannot possess an alias.
     * - There can only be at max 1 rest parameter per command.
     * - The rest parameter cannot possesses a default value.
     * - Only allow string, number, boolean, and their rest version (Rest parameters: rest[string], rest[number], rest[boolean]).  
     * 
     * Notes:
     * - The rest parameter and optional parameters (parameter with default value) in a command will implicitly be move to the very back of the parameters list (optional parameters first, rest parameter 2nd).
     * - Leading and trailing whitespaces in command name, parameters name, parameter aliases, and parameter type will be remove.
     * 
     * CommandProperties:  
     * - Action: Handler for the command.  
     * - OnSuccess: Optional success handler for the command.  
     * - OnFailure: Optional error handler for the command. The executor will rethrows the error if this isn't defined.  
     * - Description: Optional description text for the command.  
     * - Params: The command's parameter. (  
     *   Value: Optional default value for the parameter.  
     *   Alias: Optional single character alias for the parameter.  
     *   Description: Optional description text for the parameter.  
     *   Type: The type of the param.  
     * )
     * 
     * @param Name The name of the command.
     * @param CommandProperties Properties of the command.
     */
    constructor(Name: string, CommandProperties: ICommand) {
        if(!/^[A-Za-z][\w\d-]+$/.test(Name))
            throw new SyntaxError(`${Name} is not a valid syntax for a command name.`);

        if(command.CommandList[Name])
            throw new RangeError(`Cannot declare a command more than once. (${Name})`);
        
        if(!(CommandProperties.Action instanceof Function)) 
            throw new TypeError("Action is not callable.");
        
        if(CommandProperties.OnSuccess && !(CommandProperties.OnSuccess instanceof Function)) 
            throw new TypeError("OnSuccess is not callable.");
        
        if(CommandProperties.OnFailure && !(CommandProperties.OnFailure instanceof Function)) 
            throw new TypeError("OnFailure is not callable.");
        
        const CommandParam: CommandParams = CommandProperties.Params;
        const Processed: ICommand = { Action: CommandProperties.Action, OnSuccess: CommandProperties.OnSuccess, OnFailure: CommandProperties.OnFailure, Description: CommandProperties.Description };
        Processed.Params = {};
        Name = Name.trim();
        
        if(CommandParam) {
            const allowedParamTypes = ["string", "number", "boolean", "rest[string]", "rest[number]", "rest[boolean]"];
            for(const ParamName in CommandParam) {
                const Param = CommandParam[ParamName];
                const ParamType: string = CommandParam[ParamName].Type;
                
                const _new: string = ParamName.trim();
                
                if(!/^[A-Za-z][\w-]*$/.test(_new))
                    throw new SyntaxError(`${_new} is not a valid syntax for a parameter name.`);
                
                if(!allowedParamTypes.includes(ParamType)) 
                    throw new TypeError(`Type ${ParamType} doesn't exists or isn't supported.`);

                Processed.Params[_new] = { Type: CommandParam[ParamName].Type.trim() as AllowedParamTypes };

                if(ParamType.startsWith("rest")) {
                    if(Param.Value) {
                        throw new SyntaxError("Rest parameters cannot have a default value.");
                    }

                    if(Param.Alias) {
                        throw new SyntaxError("Rest parameters cannot possess an alias.");
                    }
                }

                if(Param.Alias) {
                    if(!/^[A-Za-z]{1}$/.test(Param.Alias.trim())) {
                        throw new SyntaxError(`${Param.Alias.trim()} is not a valid alias syntax.`);
                    }

                    Processed.Params[_new].Alias = Param.Alias.trim();
                }
                
                if(Param.Value && typeof Param.Value !== ParamType) {
                    throw new TypeError(`The default value of ${ParamName} does not match its type.`);
                }

                Processed.Params[_new].Value = CommandParam[ParamName].Value;
                Processed.Params[_new].Description = CommandParam[ParamName].Description?.trim()?.replace(/\s+/g, " ");
            }
            
            const aliases = new Set();
            for(const Name in CommandParam) {
                const alias = CommandParam[Name].Alias;
                if(!alias) 
                    continue;
                if(aliases.has(alias)) 
                    throw new SyntaxError(`Alias '${alias}' is used more than once.`);   
                aliases.add(alias);
            }

            if(Object.keys(CommandParam).filter((ParamName: string): boolean => CommandParam[ParamName].Type.startsWith("rest")).length > 1) {
                throw new SyntaxError("A command cannot contains multiple rest parameters.");
            }
        }

        this.Name = Name;
        this.Parameters = Object.keys(Processed.Params).length > 0 ? moveToBack(moveToBack(Processed.Params, key => Boolean(Processed.Params[key].Value)), key => Processed.Params[key].Type.startsWith("rest")) : undefined;
        this.Description = Processed.Description;
        this.Action = Processed.Action;
        this.OnSuccess = Processed.OnSuccess;
        this.OnFailure = Processed.OnFailure;

        helpArray.push([Name, this.Description || "No description provided.", this.Parameters ? Object.keys(this.Parameters).map((ParamName: string): string => command.stringWrapper(`${ParamName}(${this.Parameters[ParamName].Type}, ${this.Parameters[ParamName].Alias ? `-${this.Parameters[ParamName].Alias}` : "no alias"}): ${this.Parameters[ParamName].Description || "No description provided."}`, 40)).join("\n") : ""]);

        command.CommandList[Name] = this;
    }

    /**
     * Parse CommandString and execute it.  
     * Errors from Action will be catch. If OnFailure is defined, the function will be call with the error passed in as the argument.  
     * Otherwise, rethrow the error instead.  
     * 
     * @param CommandString The representation of the command as a string.
     */
    public static readonly execute = async (CommandString: string): Promise<void> => {
        CommandString = CommandString.replace(/ +/, " ");

        const tokenize = (input: string): string[] => {
            const tokens: string[] = [];
            let current: string = "";
            let quote: "\"" | "'" | null = null;
            let escaped: boolean = false;   

            for(const char of input) {    
                if(escaped) {
                    current += char;
                    escaped = false;
                    continue;
                }
    
                if(char === "\\" && quote !== null) {
                    escaped = true;
                    continue;
                }
    
                if(quote !== null) {
                    if(char === quote) 
                        quote = null;
                    else current += char;
                    continue;
                }
    
                if(char === '"' || char === "'") {
                    quote = char;
                    continue;
                }
    
                if(/\s/.test(char) && current.length > 0) {
                    tokens.push(current);
                    current = "";
                } 
                else current += char;
            }

            if(quote) 
                throw new SyntaxError("Unclosed quoted string.");

            if(current.length > 0) 
                tokens.push(current);

            return tokens;
        };

        const CommandParts: string[] = tokenize(CommandString);

        if(CommandParts.length === 0)
            throw new TypeError("Empty command.");
        
        const Name: string = CommandParts.shift()!;
        const Command: command = command.CommandList[Name];

        if(!Command)
            throw new TypeError(`Unknown command: ${Name}.`);
        
        const Params: CommandParams = Command.Parameters ?? {};
        const ParamNames: string[] = Object.keys(Params);

        const ArgMap: { [param: string]: any } = {};

        const cast = (value: string, type: AllowedParamTypes): any => {
            const base: string = type.replace("rest[", "").replace("]", "");
            
            switch(base) {
                case "string":
                    return value;

                case "number":
                    if(!/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(value))
                        throw new TypeError(`${value} isn't a number.`);
                    return Number(value);
                
                case "boolean":
                    if(value === "true") 
                        return true;
                    if(value === "false") 
                        return false;
                    throw new TypeError(`${value} is not a valid boolean.`);
            }
        };

        const RestParam: string = ParamNames.find((Param: string): boolean => Params[Param].Type.startsWith("rest"));
        const PositionalParams: string[] = ParamNames.filter((Param: string): boolean => !Params[Param].Type.startsWith("rest"));

        let index = 0;
        let posIndex = 0;

        while(index < CommandParts.length) {
            const token = CommandParts[index];
    
            if(token.startsWith("--")) {
                const Name: string = token.slice(2);
                const Param: { Value?: any, Alias?: string, Type: AllowedParamTypes } = Params[Name];
    
                if(!Param) 
                    throw new TypeError(`Parameter ${Name} does not exist.`);
    
                if(Param.Type === "boolean") 
                    ArgMap[Name] = true;
                else {
                    if(index + 1 >= CommandParts.length)
                        throw new SyntaxError(`Parameter ${Name} requires a value.`);
    
                    const value: string = CommandParts[index++];
                    ArgMap[Name] = cast(value, Param.Type);
                }
    
                index++;
                continue;
            }

            if(token.startsWith("-") && token !== "-") {
                const Aliases: string[] = token.slice(1).split("");
                const groupParams: string[] = Aliases.map(Alias => command.fromAlias(Alias, Command));
                const groupDefs: { Value?: any, Alias?: string, Type: AllowedParamTypes }[] = groupParams.map(Param => Params[Param]);
    
                const boolOnly: boolean = groupDefs.every(Param => Param.Type === "boolean");
    
                if(boolOnly) {
                    for(const Param of groupParams) {
                        ArgMap[Param] = true;
                    }
    
                    index++;
                    continue;
                }
    
                const nonBoolFlags: string[] = groupParams.filter(p => Params[p].Type !== "boolean");
                const needed: number = nonBoolFlags.length;
    
                if(index + needed >= CommandParts.length)
                    throw new SyntaxError(`Flag group ${token} requires ${needed} values but only ${CommandParts.length - index - 1} provided.`);
    
                let valuePtr: number = index + 1;
    
                for(const ParamName of groupParams) {
                    const Param: { Value?: any, Alias?: string, Type: AllowedParamTypes } = Params[ParamName];
    
                    if(Param.Type === "boolean") 
                        ArgMap[ParamName] = true;
                    else {
                        const raw = CommandParts[valuePtr++];
                        ArgMap[ParamName] = cast(raw, Param.Type);
                    }
                }
    
                index = valuePtr;
                continue;
            }

            if(RestParam && posIndex >= PositionalParams.length) {
                if(!ArgMap[RestParam]) 
                    ArgMap[RestParam] = [];

                ArgMap[RestParam].push(cast(token, Params[RestParam].Type));
            } 
            else {
                const ParamName: string = PositionalParams[posIndex];
                const Param: { Value?: any, Alias?: string, Type: AllowedParamTypes } = Params[ParamName];
                ArgMap[ParamName] = cast(token, Param.Type);
                posIndex++;
            }
            index++;
        }

        for(const ParamName of ParamNames) {
            const Param: { Value?: any, Alias?: string, Type: AllowedParamTypes } = Params[ParamName];
    
            if(ArgMap[ParamName] !== undefined)
                continue;
    
            if(Param.Value !== undefined) {
                ArgMap[ParamName] = Param.Value;
                continue;
            }
    
            if(Param.Type.startsWith("rest")) {
                ArgMap[ParamName] = [];
                continue;
            }
    
            throw new SyntaxError(`Missing required parameter ${ParamName}.`);
        }

        try {
            const OrderedArgs: any[] = ParamNames.map(Param => ArgMap[Param]);
            let Returned: any;
            if(Command.Action.constructor.name === "AsyncFunction")
                Returned = await Command.Action(...OrderedArgs);
            else Returned = Command.Action(...OrderedArgs);
            
            if(Command.OnSuccess) {
                Returned ? Command.OnSuccess(Returned) : Command.OnSuccess();
            }
        }
        catch(err) {
            if(!Command.OnFailure) 
                throw err;
            Command.OnFailure(err);
        }
    };
    
    public static readonly createAlias = (Name: string, For: string, Description?: string): void => {
        if(!/^[A-Za-z][\w\d-]+$/.test(Name)) 
            throw new SyntaxError(`${Name} is not a valid syntax for a command name.`);

        if(!command.CommandList[For]) 
            throw new TypeError(`${For} doesn't exist as a command.`);

        const clone: ICommand = {
            Action: command.CommandList[For].Action,
            OnSuccess: command.CommandList[For].OnSuccess,
            OnFailure: command.CommandList[For].OnFailure,
            Params: command.CommandList[For].Parameters,
            Description: command.CommandList[For].Description || Description
        };

        new command(Name, clone);
    };

    private static readonly fromAlias = (Alias: string, command: command): string => {
        Alias = Alias.trim();
        if(Alias.length !== 1)
            throw new RangeError(`Invalid param name.`);

        for(const Param in command.Parameters) {
            if(command.Parameters[Param].Alias === Alias) {
                return Param;
            }
        }
        throw new TypeError(`Param with alias ${Alias} does not exist in ${command.Name}.`);
    };

    private static readonly stringWrapper = (str: string, every: number): string => {
        let output: string = "",
            count: number = 0;

        for(const char of str) {
            output += char;
            count++;

            if(count === every) {
                count = 0;
                let backIndex: number = output.lastIndexOf(" ");
                if(char === " ") 
                    output = `${output.slice(0, -1)}\n`;
                else if(backIndex !== -1) {
                    output = `${output.substring(0, backIndex)}\n${output.substring(backIndex + 1)}`;
                    count = output.length - output.lastIndexOf("\n") - 1;
                }
                else output += "\n";
            }
        }
        return output;
    };
}

const helpArray: string[][] = [["Command Name", "Description", "Parameters"]];

/**
 * Built-in help command.
 */
new command("help", {
    Action: (command_: string): string => {
        let filteredHelpArray: string[][];
        if(command_ !== "*") {
            if(!command.CommandList[command_]) {
                throw new TypeError(`Command ${command_} does not exist.`);
            }
            filteredHelpArray = [helpArray[0]];
            filteredHelpArray.push(helpArray.find((row: string[]): boolean => row[0] === command_));
        }
        else filteredHelpArray = helpArray;
        return `\n${Table.Parse(filteredHelpArray).Stringify()}`;
    },
    OnSuccess: (result: string): void => print(result, undefined, false),
    OnFailure: (err: any): void => print(err, undefined, false),
    Params: {
        command: {
            Type: "string",
            Value: "*",
            Description: "Optional parameter. If provided, only print the help message for the provided command."
        }
    },
    Description: "Print this message."
});