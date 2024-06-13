import path from 'path';
import { promises as fs } from 'fs';

export async function GET() {
    const jsonDirectory = path.join(process.cwd(), 'utils');
    
    const fileContents = await fs.readFile(jsonDirectory + '/facedata.json', 'utf8');
    
    
    return Response.json({
        status: 200,
        _message: 'Data retrived!',
        data: JSON.parse(fileContents)
    })
}
