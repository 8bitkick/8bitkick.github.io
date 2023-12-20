export const assistantConfig = {
    "name": "voxelAstra",
    "model": "gpt-3.5-turbo-1106",
    "instructions": 
    `
    The user wants your help to build a 3D scene out. 
    The center of the room is (0,1.25,0). The scale of the room is (5,2.5,5). The floor is at y=0.
    Placing an sphere at y=<sphere size> places it on the floor exactly.
    Don't make objects bigger than (0.5,0.5,0.5) or smaller than (0.01,0.01,0.01).
    Each object must have a unique name.
    Keep your replies succinct.
    `
    ,
    "tools": [
        {
            "type": "function",
            "function": {
                "name": "add_object",
                "description": "Add a specified object to a virtual scene. Object is animated to dropped from above the scene and lands in the specified position.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "objectName": {
                            "type": "string"
                        },
                        "objectType": {
                            "type": "string",
                            "enum": [
                                "sphere",
                                "cylinder",
                                "cube",
                            ]
                        },
                        "material": {
                            "type": "string",
                            "enum": [
                                "plastic",
                                "metal",
                                "glass",
                                "transparent"
                            ]
                        },
                        "color": {
                            "type": "object",
                            "properties": {
                                "r": {
                                    "type": "integer"
                                },
                                "g": {
                                    "type": "integer"
                                },
                                "b": {
                                    "type": "integer"
                                }
                            },
                            "required": [
                                "r",
                                "g",
                                "b"
                            ]
                        },
                        "scale": {
                            "type": "object",
                            "properties": {
                                "x": {
                                    "type": "number"
                                },
                                "y": {
                                    "type": "number"
                                },
                                "z": {
                                    "type": "number"
                                }
                            },
                            "required": [
                                "x",
                                "y",
                                "z"
                            ]
                        },
                        "position": {
                            "type": "object",
                            "properties": {
                                "x": {
                                    "type": "number"
                                },
                                "y": {
                                    "type": "number"
                                },
                                "z": {
                                    "type": "number"
                                }
                            },
                            "required": [
                                "x",
                                "y",
                                "z"
                            ]
                        },
                        "rotation": {
                            "type": "object",
                            "properties": {
                                "x": {
                                    "type": "number"
                                },
                                "y": {
                                    "type": "number"
                                },
                                "z": {
                                    "type": "number"
                                }
                            },
                            "required": [
                                "x",
                                "y",
                                "z"
                            ]
                        }
                    },
                    "required": [
                        "objectName",
                        "objectType",
                        "material",
                        "color",
                        "scale",
                        "position",
                    ]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "remove_object",
                "description": "Remove a specified object from a virtual scene",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "objectName": {
                            "type": "string"
                        }
                    },
                    "required": [
                        "objectName"
                    ]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "modify_object",
                "description": "Modify a specified object in a virtual scene",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "objectName": {
                            "type": "string",
                            "description": "Name of the object to modify"
                        },
                        "newAttributes": {
                            "type": "object",
                            "description": "New attributes for the object",
                            "properties": {
                                "objectType": {
                                    "type": "string",
                                    "enum": [
                                        "sphere",
                                        "cylinder",
                                        "cube",
                                        "other"
                                    ],
                                    "description": "New type of the object (e.g., sphere, cylinder, cube)"
                                },
                                "material": {
                                    "type": "string",
                                    "enum": [
                                        "plastic",
                                        "metal",
                                        "glass",
                                        "transparent"
                                    ],
                                    "description": "New material of the object (e.g., plastic, metal, glass, transparent)"
                                },
                                "color": {
                                    "type": "object",
                                    "properties": {
                                        "r": {
                                            "type": "integer",
                                            "description": "Red component of the new color (0-255)"
                                        },
                                        "g": {
                                            "type": "integer",
                                            "description": "Green component of the new color (0-255)"
                                        },
                                        "b": {
                                            "type": "integer",
                                            "description": "Blue component of the new color (0-255)"
                                        }
                                    },
                                    "required": [
                                        "r",
                                        "g",
                                        "b"
                                    ]
                                },
                                "scale": {
                                    "type": "object",
                                    "properties": {
                                        "x": {
                                            "type": "number",
                                            "description": "Scale factor along the X axis"
                                        },
                                        "y": {
                                            "type": "number",
                                            "description": "Scale factor along the Y axis"
                                        },
                                        "z": {
                                            "type": "number",
                                            "description": "Scale factor along the Z axis"
                                        }
                                    },
                                    "required": [
                                        "x",
                                        "y",
                                        "z"
                                    ]
                                },
                                "rotation": {
                                    "type": "object",
                                    "properties": {
                                        "x": {
                                            "type": "number"
                                        },
                                        "y": {
                                            "type": "number"
                                        },
                                        "z": {
                                            "type": "number"
                                        }
                                    },
                                    "required": [
                                        "x",
                                        "y",
                                        "z"
                                    ]
                                },  
                                "position": {
                                    "type": "object",
                                    "properties": {
                                        "x": {
                                            "type": "number",
                                            "description": "New X coordinate in the scene"
                                        },
                                        "y": {
                                            "type": "number",
                                            "description": "New Y coordinate in the scene"
                                        },
                                        "z": {
                                            "type": "number",
                                            "description": "New Z coordinate in the scene"
                                        }
                                    },
                                    "required": [
                                        "x",
                                        "y",
                                        "z"
                                    ]
                                }
                            }
                        }
                    },
                    "required": [
                        "objectName",
                        "newAttributes"
                    ]
                }
            }
        }
    ],
    "file_ids": [],
    "metadata": {}
};
