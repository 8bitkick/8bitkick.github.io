export const prompts = [
        "Build a snowman!",
        "Add two coal eyes and a round orange nose to the snowman",
        "Add a top hat to the snowman",
    ];

export const calls = [
        {
            function: {
                name: "add_object",
                arguments: JSON.stringify({
                    "objectName": "snowball",
                    "objectType": "sphere",
                    "material": "glass",
                    "color": {
                        "r": 20,
                        "g": 255,
                        "b": 100
                    },
                    "scale": {
                        "x": 1,
                        "y": 1,
                        "z": 1
                    },
                    "position": {
                        "x": 0,
                        "y": 0.5,
                        "z": 0
                    },
                    "rotation": {
                        "x": 0,
                        "y": 0,
                        "z": 0
                    }
                })
            }
        },
        {
            function: {
                name: "modify_object",
                arguments: JSON.stringify({
                    "objectName": "snowball",
                    "newAttributes": {
                        "material": "metal",
                        "color": {
                        "r": 255,
                        "g": 255,
                        "b": 0
                    },
                    "scale": {
                        "x": 0.2,
                        "y": 1,
                        "z": 1
                    },
                    "position": {
                        "x": 0.5,
                        "y": 0.5,
                        "z": 0
                    },
                    "rotation": {
                        "x": 0,
                        "y": 45,
                        "z": 45
                    }
                }
            })
            }
        },
        {
            function: {
                name: "modify_object",
                arguments: JSON.stringify({
                    "objectName": "snowball",
                    "newAttributes": {
                    "position": {
                        "x": 0.5,
                        "y": 0,
                        "z": 0
                    },
                    "rotation": {
                        "x": 0,
                        "y": 60,
                        "z": 60
                    }
                }
            })
            }
        },
        {
            function: {
                name: "modify_object",
                arguments: JSON.stringify({
                    "objectName": "snowball",
                    "newAttributes": {
                    "scale": {
                        "x": 1,
                        "y": 1,
                        "z": 1
                    },
                }
            })
            }
        }
    ];