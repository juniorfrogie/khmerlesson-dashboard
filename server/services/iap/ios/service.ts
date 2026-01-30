import https from "https"

export const verifyReceipt = async (hostname: string, receiptData: string) => {

    const body = JSON.stringify({
        'receipt-data': receiptData, // Base64 encoded
    })

    const options = {
        hostname: hostname,
        path: "/verifyReceipt",
        method: "POST",
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(body)
        }
    } as https.RequestOptions

    return new Promise<any>((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = ''
            res.on('data', (chunk) => {
                data += chunk
            })
            res.on('end', async () => {
                try{
                    const parsedData = JSON.parse(data)
                    console.log(parsedData)
                    if(parsedData.status === 21007){
                        let hostname = 'sandbox.itunes.apple.com'
                        await verifyReceipt(hostname, receiptData)
                    }
                    else if(parsedData.status === 0){
                        resolve(parsedData)
                    }else{
                        reject(new Error(`Receipt verification failed with status: ${parsedData.status}`))
                    }
                }catch(err){
                    console.error(err)
                    reject(err)
                }
                //resolve(JSON.parse(data))
            })
        })
        //
        req.on('error', (err) => {
            reject(err)
        })
        req.write(body)
        req.end()
    })
}

// const processVerifcation = async (receiptData: string) => {
//     let hostname = 'buy.itunes.apple.com'
//     let response = await verifyReceipt(hostname, receiptData)
//     if(response.status === 21007){
//         console.log("Switching to Sandbox URL...")
//         hostname = 'sandbox.itunes.apple.com'
//         response = await verifyReceipt(hostname, receiptData)
//     }

//     if(response.status === 0){
//         console.log("Receipt is VALID.")
//     }else{
//         console.error("Receipt is INVALID", response.status)
//     }
// }