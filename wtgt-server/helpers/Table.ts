class ValueError extends Error {
    constructor(Message: string) {
        super(Message);
        this.name = "ValueError";
    }
}

export default class Table {
    public Table: string[][] = [];

    public constructor(row: number = 1, column: number = 1) {
        if(row <= 0 && column <= 0)
            throw new ValueError("Cannot create a table with 0 cells.");
        else if(column <= 0) 
            throw new ValueError("Cannot create a table with 0 columns.");
        else if(row <= 0) 
            throw new ValueError("Cannot create a table with 0 rows.");

        this.Table = [...new Array(row)].map((): string[] => new Array(column).fill(""));
    }

    public static Parse = (table: string[][]): Table => {
        if(table.length === 0)
            throw new ValueError("Cannot create a table with 0 rows.");

        const NumberOfColumns: number = table[0].length;
        if(NumberOfColumns === 0) {
            throw new ValueError("Cannot create a table with 0 columns.");
        }
        
        for(const [i, Row] of table.entries()) {
            if(Row.length !== NumberOfColumns) {
                throw new ValueError(`Row ${i} has ${Row.length} columns, expected ${NumberOfColumns}.`);
            }
        }

        const New: Table = new Table();
        New.Table = structuredClone(table);
        return New;
    };

    public readonly AddRow = (index: number = this.GetLength() - 1, count: number = 1): void => {
        if(count < 1)
            throw new ValueError("count must be greater than 0.");

        for(let _ = 0; _ < count; ++_) {
            this.Table.splice(Table.Clamp(index, this.GetLength() - 1), 0, Array(this.GetWidth()).fill(""));
        }
    };

    public readonly AddColumn = (index: number = this.GetWidth() - 1, count: number = 1): void => {
        if(count < 1)
            throw new ValueError("count must be greater than 0.");

        for(let _ = 0; _ < count; ++_) {
            for(const Row of this.Table) {
                Row.splice(Table.Clamp(index, this.GetWidth() - 1), 0, "")
            }
        }
    };

    public readonly Set = (value: string, row: number, column: number): void => { this.Table[row][column] = value };

    public readonly DeleteRow = (index: number): void => {
        if(this.GetLength() === 1)
            throw new ValueError("Cannot remove the last row of the table.");

        this.Table.splice(index, 1);
    }

    public readonly DeleteColumn = (index: number): void => {
        if(this.GetWidth() === 1)
            throw new ValueError("Cannot remove the last column of the table.");

        for(let i = 0; i < this.GetLength(); ++i)
            this.Table[i].splice(index, 1);
    }

    public readonly GetLength = (): number => this.Table.length;
    
    public readonly GetWidth = (): number => Table.Zip(this.Table).length;

    public readonly GetRow = (index: number): string[] => structuredClone(this.Table[index]);

    public readonly GetComlumn = (index: number): string[] => Table.Zip(this.Table)[index];

    public readonly Get = (row: number, column: number): string => this.Table[row][column];

    public readonly Stringify = (justification: "Left" | "Right" | "Center" | "L" | "R" | "C" = "L", alignment: "Top" | "Middle" | "Bottom" | "T" | "M" | "B" = "M"): string => {
        const SplittedTable: string[][][] = this.Table.map((Row: string[]): string[][] => Row.map((Cell: string): string[] => Cell.split("\n")));

        const ColumnWidthds: number[] = [];
        for(let Index: number = 0; Index < this.GetWidth(); Index++) {
            ColumnWidthds.push(Math.max(...SplittedTable.map((Row: string[][]): number => Math.max(...Row[Index].map((Line: string): number => Line.length)))));
        }

        const Output: string[] = [`┌${ColumnWidthds.map((Width: number) => "─".repeat(Width + 2)).join("┬")}┐`];
        for(const [Index, Cells] of SplittedTable.entries()) {
            const Separator: string = Index == this.GetLength() - 1 ? `└${ColumnWidthds.map(Width => "─".repeat(Width + 2)).join("┴")}┘` : `├${ColumnWidthds.map(Width => "─".repeat(Width + 2)).join("┼")}┤`;
            const RowHeight: number = Math.max(...Cells.map((Line: string[]): number => Line.length));

            const PaddedCells: string[][] = Cells.map(
                (Cell: string[]) => alignment.startsWith("T") ? 
                Cell.concat(new Array<string>(RowHeight - Cell.length).fill("")) : alignment.startsWith("B") ? 
                new Array<string>(RowHeight - Cell.length).fill("").concat(Cell) : 
                new Array<string>(Math.floor((RowHeight - Cell.length) / 2)).fill("").concat(Cell, new Array<string>((RowHeight - Cell.length) - Math.floor((RowHeight - Cell.length) / 2)).fill(""))
            );

            for(let RowIndex: number = 0; RowIndex < RowHeight; RowIndex++) {
                const RenderedCells: string[] = [...PaddedCells.entries()].map(
                    ([ColumnIndex, ]: [number, string[]]) => justification.startsWith("R") ? 
                    PaddedCells[ColumnIndex][RowIndex].padStart(ColumnWidthds[ColumnIndex]) : justification.startsWith("L") ? 
                    PaddedCells[ColumnIndex][RowIndex].padEnd(ColumnWidthds[ColumnIndex]) : 
                    Table.Center(PaddedCells[ColumnIndex][RowIndex], ColumnWidthds[ColumnIndex])
                );
                Output.push(`│ ${RenderedCells.join(" │ ")} │`)
            }
            Output.push(Separator);
        }
        return Output.join("\n");
    };
    
    public readonly CSVify = (): string => this.Table.map(Row => Row.join(",")).join("\n");

    private static Center = (string: string, width: number, pad: string = " "): string => {
        if(string.length >= width)
            return string;

        const TotalPadding = width - string.length;
        const Left = Math.floor(TotalPadding / 2.0);
        const Right = TotalPadding - Left;
        return `${pad.repeat(Left)}${string}${pad.repeat(Right)}`;
    };

    private static Zip = (Table: any[][]): any[][] => Array.from({ length: Table[0].length }, (_, colIndex) => Table.map(row => row[colIndex]));

    private static Clamp = (number: number, min: number, max?: number):number => {
        if(!max)
            [min, max] = [0, min];

        return Math.min(Math.max(number, min), max);
    };
}