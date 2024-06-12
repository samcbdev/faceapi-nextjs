import fs from "fs";
import path from "path";

export async function POST(req) {
    const { name, faceData } = await req.json();
    const data = { name, faceData };
    
    const filePath = path.join(process.cwd(), 'utils', 'facedata.json'); // Path to the JSON file

    try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        
        const jsonData = fileContent ? JSON.parse(fileContent) : [];

        const nameExists = jsonData.some(item => item.name.trim().toLowerCase() === name.trim().toLowerCase());

        console.log("nameExists", nameExists);

        if(nameExists) {
            return Response.json({
                status: 200,
                _message: 'Data already exists!',
            })
        }

        if(jsonData.length === 0) {
            console.log(data);
            jsonData.push(data);
        } else {
            console.log("orhere");
            jsonData.push(data);
        }

        const jsonString = JSON.stringify(jsonData, null, 2);
        fs.writeFileSync(filePath, jsonString, 'utf-8');
        console.log('Data saved to data.json');

        return Response.json({
            status: 200,
            _message: 'Data saved!',
        })
    } catch (error) {
        console.error('Error saving data:', error);
        return Response.json({
            status: 200,
            _message: 'Data not saved!',
        })
    }
}