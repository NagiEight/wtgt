interface IObject {
    [key: string]: any;
}

export const moveToBack = (Obj: IObject, criterion: (key: string) => boolean): IObject => {
    const front: { [key: string]: any } = {};
    const back: { [key: string]: any } = {};

    for(const [key, value] of Object.entries(Obj)) {
        if(criterion(key)) 
            back[key] = value;
        else front[key] = value;
    }
    return { ...front, ...back };
};