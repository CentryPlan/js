export default function unwrapOk(obj) {
    if (obj.status=="OK") {
        return obj.details;
    } else {
        throw obj;
    }
}